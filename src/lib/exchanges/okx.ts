import { OKX_BASE, CACHE_TTL } from '../constants';
import { cache } from '../cache';
import { okxToCanonical } from '../symbol-map';
import type { ExchangeOIMap } from './types';

export interface OkxKline {
  timestamp: number;
  close: number;
}

export interface OkxOIHistPoint {
  openInterest: number;
  timestamp: number;
}

interface OkxOIResponse {
  code: string;
  data: Array<{
    instId: string;
    instType: string;
    oi: string;
    oiCcy: string;
    ts: string;
  }>;
}

export async function fetchOkxOI(): Promise<ExchangeOIMap> {
  const cached = cache.get<ExchangeOIMap>('oi:okx:all');
  if (cached) return cached;

  // Fetch OI data
  const res = await fetch(
    `${OKX_BASE}/api/v5/public/open-interest?instType=SWAP`
  );
  if (!res.ok) throw new Error(`OKX OI: ${res.status}`);
  const data: OkxOIResponse = await res.json();

  if (data.code !== '0') throw new Error(`OKX error: ${data.code}`);

  // We also need prices for OI conversion
  const priceRes = await fetch(
    `${OKX_BASE}/api/v5/market/tickers?instType=SWAP`
  );
  const priceData = await priceRes.json();
  const prices = new Map<string, number>();
  for (const t of priceData.data ?? []) {
    prices.set(t.instId, parseFloat(t.last));
  }

  const result: ExchangeOIMap = new Map();
  for (const item of data.data) {
    if (!item.instId.includes('-USDT-')) continue;

    const canonical = okxToCanonical(item.instId);
    const oiContracts = parseFloat(item.oi);
    const oiCcy = parseFloat(item.oiCcy);
    const price = prices.get(item.instId) ?? 0;

    // oiCcy is in base currency, multiply by price for USD value
    const oiUsd = oiCcy > 0 ? oiCcy * price : oiContracts * price;

    if (oiUsd > 0) {
      const existing = result.get(canonical) ?? 0;
      result.set(canonical, existing + oiUsd);
    }
  }

  cache.set('oi:okx:all', result, CACHE_TTL.OKX_ALL);
  return result;
}

// OKX kline (price history)
export async function fetchOkxPriceHistory(
  symbol: string,
  bar: string = '1H',
  limit: number = 24
): Promise<OkxKline[]> {
  const cacheKey = `klines:okx:${symbol}:${bar}`;
  const cached = cache.get<OkxKline[]>(cacheKey);
  if (cached) return cached;

  const instId = `${symbol}-USDT-SWAP`;
  const res = await fetch(
    `${OKX_BASE}/api/v5/market/candles?instId=${instId}&bar=${bar}&limit=${limit}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  if (data.code !== '0' || !data.data?.length) return [];

  // OKX returns: [ts, o, h, l, c, vol, volCcy, volCcyQuote, confirm]
  const klines: OkxKline[] = data.data.map((k: string[]) => ({
    timestamp: parseInt(k[0], 10),
    close: parseFloat(k[4]),
  }));

  cache.set(cacheKey, klines, CACHE_TTL.HISTORY);
  return klines;
}

// OKX open interest history
export async function fetchOkxOIHistory(
  symbol: string,
  period: string = '1H',
  limit: number = 24
): Promise<OkxOIHistPoint[]> {
  const cacheKey = `history:okx:${symbol}:${period}`;
  const cached = cache.get<OkxOIHistPoint[]>(cacheKey);
  if (cached) return cached;

  const instId = `${symbol}-USDT-SWAP`;
  const res = await fetch(
    `${OKX_BASE}/api/v5/public/open-interest?instId=${instId}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  if (data.code !== '0' || !data.data?.length) return [];

  // OKX only returns current OI, not history - we get a single point
  const item = data.data[0];
  const price = await getCurrentOkxPrice(instId);
  const oiCcy = parseFloat(item.oiCcy || '0');
  const oiUsd = oiCcy * price;

  const points: OkxOIHistPoint[] = [{
    openInterest: oiUsd,
    timestamp: parseInt(item.ts, 10),
  }];

  cache.set(cacheKey, points, CACHE_TTL.HISTORY);
  return points;
}

async function getCurrentOkxPrice(instId: string): Promise<number> {
  try {
    const res = await fetch(`${OKX_BASE}/api/v5/market/ticker?instId=${instId}`);
    if (!res.ok) return 0;
    const data = await res.json();
    return parseFloat(data.data?.[0]?.last ?? '0');
  } catch {
    return 0;
  }
}
