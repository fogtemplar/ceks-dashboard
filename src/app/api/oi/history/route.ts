import { NextRequest, NextResponse } from 'next/server';
import { fetchBinanceOIHistory, fetchBinancePriceHistory } from '@/lib/exchanges/binance';
import { fetchBybitOIHistory } from '@/lib/exchanges/bybit';
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
      { status: 400 }
    );
  }

  const canonical = symbol.toUpperCase();

  const binancePeriod =
    period === '4h' ? '4h' : period === '1d' ? '1d' : '1h';
  const bybitInterval =
    period === '4h' ? '4h' : period === '1d' ? '1d' : '1h';
  const limit = period === '1d' ? 30 : period === '4h' ? 42 : 24;

  try {
    const [binanceHist, bybitHist, priceHist] = await Promise.allSettled([
      fetchBinanceOIHistory(canonical, binancePeriod, limit),
      fetchBybitOIHistory(canonical, bybitInterval, limit),
      fetchBinancePriceHistory(canonical, binancePeriod, limit),
    ]);

    const binanceData =
      binanceHist.status === 'fulfilled' ? binanceHist.value : [];
    const bybitData =
      bybitHist.status === 'fulfilled' ? bybitHist.value : [];
    const priceData =
      priceHist.status === 'fulfilled' ? priceHist.value : [];

    // Build price lookup by normalized timestamp
    const priceMap = new Map<number, number>();
    for (const k of priceData) {
      const ts = Math.floor(k.timestamp / 3600000) * 3600000;
      priceMap.set(ts, k.close);
    }

    // Build timestamp-indexed map
    const pointMap = new Map<
      number,
      { binance: number | null; bybit: number | null; price: number | null }
    >();

    for (const p of binanceData) {
      const ts = Math.floor(p.timestamp / 3600000) * 3600000;
      const existing = pointMap.get(ts) ?? { binance: null, bybit: null, price: null };
      existing.binance = parseFloat(p.sumOpenInterestValue);
      existing.price = priceMap.get(ts) ?? null;
      pointMap.set(ts, existing);
    }

    for (const p of bybitData) {
      const ts = Math.floor(p.timestamp / 3600000) * 3600000;
      const existing = pointMap.get(ts) ?? { binance: null, bybit: null, price: null };
      existing.bybit = p.openInterest;
      if (!existing.price) existing.price = priceMap.get(ts) ?? null;
      pointMap.set(ts, existing);
    }

    // Fill price-only timestamps
    for (const [ts, price] of priceMap) {
      if (!pointMap.has(ts)) {
        pointMap.set(ts, { binance: null, bybit: null, price });
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
      { status: 500 }
    );
  }
}
