import { CACHE_TTL } from '../constants';
import { cache } from '../cache';
import type { ExchangeOIMap, PriceMap } from './types';

const BITGET_BASE = 'https://api.bitget.com';

interface BitgetTickerResponse {
  code: string;
  data: Array<{
    symbol: string;
    lastPr: string;
    holdingAmount: string;
    usdtVolume: string;
  }>;
}

interface BitgetFetchResult {
  oi: ExchangeOIMap;
  prices: PriceMap;
}

function bitgetToCanonical(symbol: string): string {
  return symbol.replace(/USDT$/, '');
}

async function fetchBitgetTickers(): Promise<BitgetFetchResult> {
  const cached = cache.get<BitgetFetchResult>('bitget:tickers:parsed');
  if (cached) return cached;

  const res = await fetch(
    `${BITGET_BASE}/api/v2/mix/market/tickers?productType=USDT-FUTURES`
  );
  if (!res.ok) throw new Error(`Bitget tickers: ${res.status}`);
  const data: BitgetTickerResponse = await res.json();

  if (data.code !== '00000') throw new Error(`Bitget error: ${data.code}`);

  const oi: ExchangeOIMap = new Map();
  const prices: PriceMap = new Map();

  for (const ticker of data.data ?? []) {
    if (!ticker.symbol.endsWith('USDT')) continue;
    const canonical = bitgetToCanonical(ticker.symbol);
    const price = parseFloat(ticker.lastPr);
    const holdingAmount = parseFloat(ticker.holdingAmount);

    // holdingAmount is OI in base asset, multiply by price for USD
    const oiUsd = holdingAmount * price;

    if (oiUsd > 0) oi.set(canonical, oiUsd);
    if (price > 0) prices.set(canonical, price);
  }

  const result = { oi, prices };
  cache.set('bitget:tickers:parsed', result, CACHE_TTL.BYBIT_ALL);
  return result;
}

export async function fetchBitgetOI(): Promise<ExchangeOIMap> {
  const { oi } = await fetchBitgetTickers();
  return oi;
}

export async function fetchBitgetPrices(): Promise<PriceMap> {
  const { prices } = await fetchBitgetTickers();
  return prices;
}

export interface BitgetKline {
  timestamp: number;
  close: number;
}

export interface BitgetOIHistPoint {
  openInterest: number;
  timestamp: number;
}

// Bitget kline (price history)
export async function fetchBitgetPriceHistory(
  symbol: string,
  granularity: string = '1H',
  limit: number = 24
): Promise<BitgetKline[]> {
  const cacheKey = `klines:bitget:${symbol}:${granularity}`;
  const cached = cache.get<BitgetKline[]>(cacheKey);
  if (cached) return cached;

  const bitgetSymbol = `${symbol}USDT`;
  const res = await fetch(
    `${BITGET_BASE}/api/v2/mix/market/candles?symbol=${bitgetSymbol}&productType=USDT-FUTURES&granularity=${granularity}&limit=${limit}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  if (data.code !== '00000' || !data.data?.length) return [];

  // Bitget returns: [ts, o, h, l, c, vol, volUsdt]
  const klines: BitgetKline[] = data.data.map((k: string[]) => ({
    timestamp: parseInt(k[0], 10),
    close: parseFloat(k[4]),
  }));

  cache.set(cacheKey, klines, CACHE_TTL.HISTORY);
  return klines;
}

// Bitget open interest history
export async function fetchBitgetOIHistory(
  symbol: string,
  period: string = '1H',
  limit: number = 24
): Promise<BitgetOIHistPoint[]> {
  const cacheKey = `history:bitget:${symbol}:${period}`;
  const cached = cache.get<BitgetOIHistPoint[]>(cacheKey);
  if (cached) return cached;

  const bitgetSymbol = `${symbol}USDT`;
  const res = await fetch(
    `${BITGET_BASE}/api/v2/mix/market/open-interest?symbol=${bitgetSymbol}&productType=USDT-FUTURES`
  );
  if (!res.ok) return [];
  const data = await res.json();
  if (data.code !== '00000' || !data.data) return [];

  // Bitget returns current OI snapshot
  const item = data.data;
  const price = parseFloat(item.lastPr || '0');
  const holdingAmount = parseFloat(item.holdingAmount || '0');
  const oiUsd = holdingAmount * price;

  const points: BitgetOIHistPoint[] = [{
    openInterest: oiUsd,
    timestamp: Date.now(),
  }];

  cache.set(cacheKey, points, CACHE_TTL.HISTORY);
  return points;
}
