import { NextResponse } from 'next/server';
import { fetchAllExchangeOI, aggregateOI } from '@/lib/exchanges';
import { fetchCoinSupplyQuick, hasFullSupplyCache, fetchCoinsByIds } from '@/lib/coingecko';
import { buildSymbolMapFromSupply, normalizeMultiplierSymbol, canonicalToCoinGeckoId } from '@/lib/symbol-map';
import { enrichWithOIMC } from '@/lib/oi-mc-index';
import { saveOISnapshot, computeAllOIChanges } from '@/lib/oi-snapshots';
import { cache } from '@/lib/cache';
import { CACHE_TTL, PRICE_RATIO_MIN, PRICE_RATIO_MAX } from '@/lib/constants';
import type { AggregatedCoinOI, CoinSupplyData, DashboardResponse } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  try {
    const cached = cache.get<DashboardResponse>('oi:aggregated');
    if (cached) {
      return NextResponse.json(cached);
    }

    // Supply: quick (500 coins) on cold start, full (3000) after warm
    // Prices from exchanges (real-time)
    // MC = supply × exchange price
    const [exchangeData, supplyMap] = await Promise.all([
      fetchAllExchangeOI(),
      fetchCoinSupplyQuick(),
    ]);

    const isPartial = !hasFullSupplyCache();

    // Build symbol map from supply data (no extra API call)
    const symbolMap = buildSymbolMapFromSupply(supplyMap);

    const aggregated = aggregateOI(
      exchangeData.binance,
      exchangeData.bybit,
      exchangeData.okx,
      exchangeData.bitget
    );

    const coins: AggregatedCoinOI[] = [];

    for (const [symbol, oi] of aggregated) {
      const { base, multiplier } = normalizeMultiplierSymbol(symbol);

      // Price from exchange (real-time)
      const exchangePrice = exchangeData.prices.get(symbol) ?? exchangeData.prices.get(base) ?? 0;
      // 1000PEPE etc: exchange price is per 1000 units
      const realPrice = multiplier > 1 ? exchangePrice / multiplier : exchangePrice;

      // Supply from CoinGecko (cached 1hr)
      // Multiple tokens can share the same symbol → pick the one with closest price
      const candidates = supplyMap.get(base) ?? supplyMap.get(symbol) ?? [];
      let supply: CoinSupplyData | undefined;

      if (candidates.length === 1) {
        // Single match: validate price (>80% diff = wrong token)
        const c = candidates[0];
        if (realPrice > 0 && c.cgPrice > 0) {
          const ratio = realPrice / c.cgPrice;
          supply = (ratio >= PRICE_RATIO_MIN && ratio <= PRICE_RATIO_MAX) ? c : undefined;
        } else {
          supply = c;
        }
      } else if (candidates.length > 1 && realPrice > 0) {
        // Multiple matches: pick closest price
        let bestDiff = Infinity;
        for (const c of candidates) {
          if (c.cgPrice <= 0) continue;
          const diff = Math.abs(Math.log(realPrice / c.cgPrice));
          if (diff < bestDiff) {
            bestDiff = diff;
            supply = c;
          }
        }
        // Reject if even best match is >5x off
        if (supply && supply.cgPrice > 0) {
          const ratio = realPrice / supply.cgPrice;
          if (ratio < PRICE_RATIO_MIN || ratio > PRICE_RATIO_MAX) supply = undefined;
        }
      } else if (candidates.length > 1) {
        supply = candidates[0]; // no price → use highest MC
      }

      // Fallback: try canonical → CoinGecko ID mapping
      if (!supply) {
        const cgId = canonicalToCoinGeckoId(symbol, symbolMap) ??
                     canonicalToCoinGeckoId(base, symbolMap);
        if (cgId) {
          for (const [, entries] of supplyMap) {
            for (const data of entries) {
              if (data.id === cgId) {
                supply = data;
                break;
              }
            }
            if (supply) break;
          }
        }
      }

      // MC = circulating supply × real-time exchange price
      const circulatingSupply = supply?.circulatingSupply ?? 0;
      const marketCap = circulatingSupply > 0 && realPrice > 0
        ? circulatingSupply * realPrice
        : 0;

      coins.push({
        symbol: base,
        name: supply?.name ?? base,
        coingeckoId: supply?.id ?? '',
        image: supply?.image ?? '',
        price: realPrice,
        marketCap,
        totalOI: oi.total,
        oiByExchange: {
          binance: oi.binance,
          bybit: oi.bybit,
          okx: oi.okx,
          bitget: oi.bitget,
        },
        oiChange1h: null,
        oiChange6h: null,
        oiChange24h: null,
        oiMcIndex: 0,
        oiMcRatio: 0,
        priceChange24h: supply?.priceChange24h ?? null,
      });
    }

    // Resolve missing MC for coins with known CoinGecko IDs
    const unmatchedIds: string[] = [];
    const unmatchedCoins: AggregatedCoinOI[] = [];
    for (const coin of coins) {
      if (coin.marketCap === 0 && coin.totalOI > 100_000) {
        const cgId = canonicalToCoinGeckoId(coin.symbol, symbolMap);
        if (cgId) {
          unmatchedIds.push(cgId);
          unmatchedCoins.push(coin);
        }
      }
    }

    if (unmatchedIds.length > 0) {
      const resolved = await fetchCoinsByIds(unmatchedIds);
      for (const coin of unmatchedCoins) {
        const cgId = canonicalToCoinGeckoId(coin.symbol, symbolMap);
        if (!cgId) continue;
        const data = resolved.get(cgId);
        if (!data) continue;
        const cs = data.circulatingSupply;
        if (cs > 0 && coin.price > 0) {
          coin.marketCap = cs * coin.price;
          coin.name = data.name;
          coin.coingeckoId = data.id;
          coin.image = data.image;
          coin.priceChange24h = data.priceChange24h;
        }
      }
      if (unmatchedIds.length > 0) {
        console.log(`Resolved ${resolved.size}/${unmatchedIds.length} unmatched coins via CoinGecko IDs`);
      }
    }

    // Deduplicate by symbol (keep the one with higher OI if duplicates exist)
    const deduped = new Map<string, AggregatedCoinOI>();
    for (const coin of coins) {
      const existing = deduped.get(coin.symbol);
      if (!existing || coin.totalOI > existing.totalOI) {
        deduped.set(coin.symbol, coin);
      }
    }

    // Enrich with OI/MC index
    const enriched = enrichWithOIMC(Array.from(deduped.values()));

    // Save OI snapshot for change tracking
    await saveOISnapshot(enriched);

    // Compute OI changes (1h / 6h / 24h) - 3 queries total
    const changes = await computeAllOIChanges(enriched);
    for (const coin of enriched) {
      const c = changes.get(coin.symbol);
      if (c) {
        coin.oiChange1h = c.oiChange1h;
        coin.oiChange6h = c.oiChange6h;
        coin.oiChange24h = c.oiChange24h;
      }
    }

    // Sort by total OI descending
    enriched.sort((a, b) => b.totalOI - a.totalOI);

    const response: DashboardResponse = {
      updatedAt: new Date().toISOString(),
      data: enriched,
      isPartial,
    };

    // Partial data: short cache so it refreshes after warm completes
    const ttl = isPartial ? 10_000 : CACHE_TTL.AGGREGATED_OI;
    cache.set('oi:aggregated', response, ttl);

    return NextResponse.json(response);
  } catch (error) {
    console.error('OI aggregation error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch OI data' },
      { status: 500 }
    );
  }
}
