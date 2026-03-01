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
