import { NextResponse } from 'next/server';
import { fetchAllExchangeOI, aggregateOI } from '@/lib/exchanges';
import { fetchCoinSupply } from '@/lib/coingecko';
import { buildSymbolMapFromSupply, normalizeMultiplierSymbol, canonicalToCoinGeckoId } from '@/lib/symbol-map';
import { enrichWithOIMC } from '@/lib/oi-mc-index';
import { cache } from '@/lib/cache';
import { CACHE_TTL } from '@/lib/constants';
import type { AggregatedCoinOI, CoinSupplyData, DashboardResponse } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cached = cache.get<DashboardResponse>('oi:aggregated');
    if (cached) {
      return NextResponse.json(cached);
    }

    // Supply data from CoinGecko (cached 1 hour - barely changes)
    // Prices from exchanges (real-time)
    // MC = supply × exchange price
    const [exchangeData, supplyMap] = await Promise.all([
      fetchAllExchangeOI(),
      fetchCoinSupply(),
    ]);

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
          supply = (ratio >= 0.2 && ratio <= 5) ? c : undefined;
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
          if (ratio < 0.2 || ratio > 5) supply = undefined;
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
        oiChange24h: null,
        oiMcIndex: 0,
        oiMcRatio: 0,
      });
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

    // Sort by total OI descending
    enriched.sort((a, b) => b.totalOI - a.totalOI);

    const response: DashboardResponse = {
      updatedAt: new Date().toISOString(),
      data: enriched,
    };

    cache.set('oi:aggregated', response, CACHE_TTL.AGGREGATED_OI);

    return NextResponse.json(response);
  } catch (error) {
    console.error('OI aggregation error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch OI data' },
      { status: 500 }
    );
  }
}
