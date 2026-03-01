import { NextRequest, NextResponse } from 'next/server';
import { fetchBinanceOIHistory, fetchBinancePriceHistory } from '@/lib/exchanges/binance';
import { fetchBybitOIHistory } from '@/lib/exchanges/bybit';
import { fetchOkxPriceHistory } from '@/lib/exchanges/okx';
import { fetchBitgetPriceHistory } from '@/lib/exchanges/bitget';
import type { OIHistoryPoint } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const symbol = searchParams.get('symbol');
  const period = searchParams.get('period') ?? '1h';

  if (!symbol) {
    return NextResponse.json(
      { error: 'symbol parameter required' },
      { status: 400 },
    );
  }

  const canonical = symbol.toUpperCase();

  // Period mapping per exchange
  const binancePeriod =
    period === '4h' ? '4h' : period === '1d' ? '1d' : '1h';
  const okxBar =
    period === '4h' ? '4H' : period === '1d' ? '1D' : '1H';
  const bitgetGranularity =
    period === '4h' ? '4H' : period === '1d' ? '1D' : '1H';
  const limit = period === '1d' ? 30 : period === '4h' ? 42 : 24;

  // Timestamp normalization interval (ms)
  const intervalMs =
    period === '1d' ? 86_400_000 : period === '4h' ? 14_400_000 : 3_600_000;

  try {
    // Fetch from all available sources in parallel
    const [
      binanceHist, bybitHist,
      binancePrice, okxPrice, bitgetPrice,
    ] = await Promise.allSettled([
      fetchBinanceOIHistory(canonical, binancePeriod, limit),
      fetchBybitOIHistory(canonical, binancePeriod, limit),
      fetchBinancePriceHistory(canonical, binancePeriod, limit),
      fetchOkxPriceHistory(canonical, okxBar, limit),
      fetchBitgetPriceHistory(canonical, bitgetGranularity, limit),
    ]);

    const binanceOI =
      binanceHist.status === 'fulfilled' ? binanceHist.value : [];
    const bybitOI =
      bybitHist.status === 'fulfilled' ? bybitHist.value : [];

    // Price: use whichever source has data (prefer OKX/Bitget since they work on Vercel)
    const okxPriceData =
      okxPrice.status === 'fulfilled' ? okxPrice.value : [];
    const bitgetPriceData =
      bitgetPrice.status === 'fulfilled' ? bitgetPrice.value : [];
    const binancePriceData =
      binancePrice.status === 'fulfilled' ? binancePrice.value : [];

    // Build price lookup - merge all sources, last write wins
    const priceMap = new Map<number, number>();
    for (const source of [binancePriceData, bitgetPriceData, okxPriceData]) {
      for (const k of source) {
        const ts = Math.floor(k.timestamp / intervalMs) * intervalMs;
        priceMap.set(ts, k.close);
      }
    }

    // Build timestamp-indexed OI map
    const pointMap = new Map<
      number,
      { binance: number | null; bybit: number | null; price: number | null }
    >();

    for (const p of binanceOI) {
      const ts = Math.floor(p.timestamp / intervalMs) * intervalMs;
      const existing = pointMap.get(ts) ?? { binance: null, bybit: null, price: null };
      existing.binance = parseFloat(p.sumOpenInterestValue);
      existing.price = priceMap.get(ts) ?? null;
      pointMap.set(ts, existing);
    }

    for (const p of bybitOI) {
      const ts = Math.floor(p.timestamp / intervalMs) * intervalMs;
      const existing = pointMap.get(ts) ?? { binance: null, bybit: null, price: null };
      existing.bybit = p.openInterest;
      if (!existing.price) existing.price = priceMap.get(ts) ?? null;
      pointMap.set(ts, existing);
    }

    // Fill price-only timestamps (so price chart always shows even without OI history)
    for (const [ts, price] of priceMap) {
      if (!pointMap.has(ts)) {
        pointMap.set(ts, { binance: null, bybit: null, price });
      } else {
        const existing = pointMap.get(ts)!;
        if (!existing.price) existing.price = price;
      }
    }

    const points: OIHistoryPoint[] = Array.from(pointMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([ts, data]) => ({
        timestamp: ts,
        binance: data.binance,
        bybit: data.bybit,
        okx: null,
        total: (data.binance ?? 0) + (data.bybit ?? 0),
        price: data.price,
      }));

    return NextResponse.json({
      symbol: canonical,
      period,
      data: points,
    });
  } catch (error) {
    console.error('OI history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch OI history' },
      { status: 500 },
    );
  }
}
