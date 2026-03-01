import { BINANCE_FUTURES_BASE, CACHE_TTL, BINANCE_BATCH_CONCURRENCY } from '../constants';
import { cache } from '../cache';
import { binanceToCanonical } from '../symbol-map';
import type { ExchangeOIMap, PriceMap } from './types';

interface BinanceExchangeInfo {
  symbols: Array<{
    symbol: string;
    contractType: string;
    status: string;
    quoteAsset: string;
  }>;
}

interface BinanceTicker {
  symbol: string;
  lastPrice: string;
}

interface BinanceOIResponse {
  symbol: string;
  openInterest: string;
  time: number;
}

async function fetchBinanceSymbols(): Promise<string[]> {
  const cached = cache.get<string[]>('exchangeInfo:binance');
  if (cached) return cached;

  const res = await fetch(`${BINANCE_FUTURES_BASE}/fapi/v1/exchangeInfo`);
  if (!res.ok) throw new Error(`Binance exchangeInfo: ${res.status}`);
  const data: BinanceExchangeInfo = await res.json();

  const symbols = data.symbols
    .filter(
      (s) =>
        s.contractType === 'PERPETUAL' &&
        s.status === 'TRADING' &&
        s.quoteAsset === 'USDT'
    )
    .map((s) => s.symbol);

  cache.set('exchangeInfo:binance', symbols, CACHE_TTL.EXCHANGE_INFO);
  return symbols;
}

async function fetchBinancePrices(): Promise<Map<string, number>> {
  const cached = cache.get<Map<string, number>>('prices:binance');
  if (cached) return cached;

  const res = await fetch(`${BINANCE_FUTURES_BASE}/fapi/v1/ticker/24hr`);
  if (!res.ok) throw new Error(`Binance ticker: ${res.status}`);
  const tickers: BinanceTicker[] = await res.json();

  const prices = new Map<string, number>();
  for (const t of tickers) {
    prices.set(t.symbol, parseFloat(t.lastPrice));
  }

  cache.set('prices:binance', prices, 60_000);
  return prices;
}

export async function fetchBinancePricesCanonical(): Promise<PriceMap> {
  const prices = await fetchBinancePrices();
  const result: PriceMap = new Map();
  for (const [symbol, price] of prices) {
    if (symbol.endsWith('USDT')) {
      result.set(binanceToCanonical(symbol), price);
    }
  }
  return result;
}

async function fetchSingleOI(symbol: string): Promise<{ symbol: string; oi: number } | null> {
  try {
    const res = await fetch(
      `${BINANCE_FUTURES_BASE}/fapi/v1/openInterest?symbol=${symbol}`
    );
    if (!res.ok) return null;
    const data: BinanceOIResponse = await res.json();
    return { symbol: data.symbol, oi: parseFloat(data.openInterest) };
  } catch {
    return null;
  }
}

export async function fetchBinanceOI(): Promise<ExchangeOIMap> {
  const cached = cache.get<ExchangeOIMap>('oi:binance:all');
  if (cached) return cached;

  const [symbols, prices] = await Promise.all([
    fetchBinanceSymbols(),
    fetchBinancePrices(),
  ]);

  const result: ExchangeOIMap = new Map();

  for (let i = 0; i < symbols.length; i += BINANCE_BATCH_CONCURRENCY) {
    const batch = symbols.slice(i, i + BINANCE_BATCH_CONCURRENCY);
    const settled = await Promise.allSettled(batch.map((s) => fetchSingleOI(s)));

    for (const r of settled) {
      if (r.status === 'fulfilled' && r.value) {
        const price = prices.get(r.value.symbol) ?? 0;
        const oiUsd = r.value.oi * price;
        if (oiUsd > 0) {
          const canonical = binanceToCanonical(r.value.symbol);
          result.set(canonical, oiUsd);
        }
      }
    }
  }

  cache.set('oi:binance:all', result, CACHE_TTL.BINANCE_SYMBOL);
  return result;
}

export interface BinanceOIHistPoint {
  symbol: string;
  sumOpenInterest: string;
  sumOpenInterestValue: string;
  timestamp: number;
}

export interface BinanceKline {
  timestamp: number;
  close: number;
}

export async function fetchBinancePriceHistory(
  symbol: string,
  interval: string = '1h',
  limit: number = 24
): Promise<BinanceKline[]> {
  const cacheKey = `klines:binance:${symbol}:${interval}`;
  const cached = cache.get<BinanceKline[]>(cacheKey);
  if (cached) return cached;

  const binanceSymbol = `${symbol}USDT`;
  const res = await fetch(
    `${BINANCE_FUTURES_BASE}/fapi/v1/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`
  );
  if (!res.ok) return [];
  const data: unknown[][] = await res.json();

  const klines: BinanceKline[] = data.map((k) => ({
    timestamp: k[0] as number,
    close: parseFloat(k[4] as string),
  }));

  cache.set(cacheKey, klines, CACHE_TTL.HISTORY);
  return klines;
}

export async function fetchBinanceOIHistory(
  symbol: string,
  period: string = '1h',
  limit: number = 24
): Promise<BinanceOIHistPoint[]> {
  const cacheKey = `history:binance:${symbol}:${period}`;
  const cached = cache.get<BinanceOIHistPoint[]>(cacheKey);
  if (cached) return cached;

  const binanceSymbol = `${symbol}USDT`;
  const res = await fetch(
    `${BINANCE_FUTURES_BASE}/futures/data/openInterestHist?symbol=${binanceSymbol}&period=${period}&limit=${limit}`
  );
  if (!res.ok) return [];
  const data: BinanceOIHistPoint[] = await res.json();

  cache.set(cacheKey, data, CACHE_TTL.HISTORY);
  return data;
}
