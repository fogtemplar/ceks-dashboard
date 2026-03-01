import { BYBIT_BASE, CACHE_TTL } from '../constants';
import { cache } from '../cache';
import { bybitToCanonical } from '../symbol-map';
import { fetchWithTimeout } from '../fetch-with-timeout';
import type { ExchangeOIMap, PriceMap } from './types';

interface BybitTickerResponse {
  retCode: number;
  result: {
    list: Array<{
      symbol: string;
      openInterest: string;
      openInterestValue: string;
      lastPrice: string;
      turnover24h: string;
    }>;
  };
}

interface BybitOIHistResponse {
  retCode: number;
  result: {
    list: Array<{
      openInterest: string;
      timestamp: string;
    }>;
  };
}

interface BybitFetchResult {
  oi: ExchangeOIMap;
  prices: PriceMap;
}

async function fetchBybitTickers(): Promise<BybitFetchResult> {
  const cached = cache.get<BybitFetchResult>('bybit:tickers:parsed');
  if (cached) return cached;

  const res = await fetchWithTimeout(
    `${BYBIT_BASE}/v5/market/tickers?category=linear`
  );
  if (!res.ok) throw new Error(`Bybit tickers: ${res.status}`);
  const data: BybitTickerResponse = await res.json();

  if (data.retCode !== 0) throw new Error(`Bybit error: ${data.retCode}`);

  const oi: ExchangeOIMap = new Map();
  const prices: PriceMap = new Map();

  for (const ticker of data.result.list) {
    if (!ticker.symbol.endsWith('USDT')) continue;
    const canonical = bybitToCanonical(ticker.symbol);
    const oiUsd = parseFloat(ticker.openInterestValue);
    const price = parseFloat(ticker.lastPrice);

    if (oiUsd > 0) oi.set(canonical, oiUsd);
    if (price > 0) prices.set(canonical, price);
  }

  const result = { oi, prices };
  cache.set('bybit:tickers:parsed', result, CACHE_TTL.BYBIT_ALL);
  return result;
}

export async function fetchBybitOI(): Promise<ExchangeOIMap> {
  const { oi } = await fetchBybitTickers();
  return oi;
}

export async function fetchBybitPrices(): Promise<PriceMap> {
  const { prices } = await fetchBybitTickers();
  return prices;
}

export interface BybitOIHistPoint {
  openInterest: number;
  timestamp: number;
}

export async function fetchBybitOIHistory(
  symbol: string,
  intervalTime: string = '1h',
  limit: number = 24
): Promise<BybitOIHistPoint[]> {
  const cacheKey = `history:bybit:${symbol}:${intervalTime}`;
  const cached = cache.get<BybitOIHistPoint[]>(cacheKey);
  if (cached) return cached;

  const bybitSymbol = `${symbol}USDT`;
  const res = await fetchWithTimeout(
    `${BYBIT_BASE}/v5/market/open-interest?category=linear&symbol=${bybitSymbol}&intervalTime=${intervalTime}&limit=${limit}`
  );
  if (!res.ok) return [];
  const data: BybitOIHistResponse = await res.json();

  if (data.retCode !== 0) return [];

  const points = data.result.list.map((p) => ({
    openInterest: parseFloat(p.openInterest),
    timestamp: parseInt(p.timestamp, 10),
  }));

  cache.set(cacheKey, points, CACHE_TTL.HISTORY);
  return points;
}
