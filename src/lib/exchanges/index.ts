import { fetchBinanceOI } from './binance';
import { fetchBinancePricesCanonical } from './binance';
import { fetchBybitOI, fetchBybitPrices } from './bybit';
import { fetchOkxOI } from './okx';
import { fetchBitgetOI, fetchBitgetPrices } from './bitget';
import type { ExchangeOIMap, PriceMap } from './types';

export { fetchBinanceOI } from './binance';
export { fetchBybitOI } from './bybit';
export { fetchOkxOI } from './okx';
export { fetchBitgetOI } from './bitget';
export { fetchBinanceOIHistory, fetchBinancePriceHistory } from './binance';
export { fetchBybitOIHistory } from './bybit';
export type { ExchangeOIMap, PriceMap } from './types';

export interface AggregatedOI {
  binance: number | null;
  bybit: number | null;
  okx: number | null;
  bitget: number | null;
  total: number;
}

export async function fetchAllExchangeOI(): Promise<{
  binance: ExchangeOIMap;
  bybit: ExchangeOIMap;
  okx: ExchangeOIMap;
  bitget: ExchangeOIMap;
  prices: PriceMap;
}> {
  const [binance, bybit, okx, bitget, binancePrices, bybitPrices, bitgetPrices] = await Promise.allSettled([
    fetchBinanceOI(),
    fetchBybitOI(),
    fetchOkxOI(),
    fetchBitgetOI(),
    fetchBinancePricesCanonical(),
    fetchBybitPrices(),
    fetchBitgetPrices(),
  ]);

  // Merge prices: Binance first, then Bybit/Bitget fill gaps
  const prices: PriceMap = new Map();
  if (bitgetPrices.status === 'fulfilled') {
    for (const [k, v] of bitgetPrices.value) prices.set(k, v);
  }
  if (bybitPrices.status === 'fulfilled') {
    for (const [k, v] of bybitPrices.value) prices.set(k, v);
  }
  if (binancePrices.status === 'fulfilled') {
    for (const [k, v] of binancePrices.value) prices.set(k, v);
  }

  return {
    binance: binance.status === 'fulfilled' ? binance.value : new Map(),
    bybit: bybit.status === 'fulfilled' ? bybit.value : new Map(),
    okx: okx.status === 'fulfilled' ? okx.value : new Map(),
    bitget: bitget.status === 'fulfilled' ? bitget.value : new Map(),
    prices,
  };
}

export function aggregateOI(
  binance: ExchangeOIMap,
  bybit: ExchangeOIMap,
  okx: ExchangeOIMap,
  bitget: ExchangeOIMap
): Map<string, AggregatedOI> {
  const allSymbols = new Set([
    ...binance.keys(),
    ...bybit.keys(),
    ...okx.keys(),
    ...bitget.keys(),
  ]);

  const result = new Map<string, AggregatedOI>();

  for (const symbol of allSymbols) {
    const b = binance.get(symbol) ?? null;
    const by = bybit.get(symbol) ?? null;
    const o = okx.get(symbol) ?? null;
    const bg = bitget.get(symbol) ?? null;
    const total = (b ?? 0) + (by ?? 0) + (o ?? 0) + (bg ?? 0);

    if (total > 0) {
      result.set(symbol, { binance: b, bybit: by, okx: o, bitget: bg, total });
    }
  }

  return result;
}
