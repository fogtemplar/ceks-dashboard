import { OKX_BASE, CACHE_TTL } from '../constants';
import { cache } from '../cache';
import { okxToCanonical } from '../symbol-map';
import { fetchWithTimeout } from '../fetch-with-timeout';
import type { ExchangeOIMap } from './types';

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
  const res = await fetchWithTimeout(
    `${OKX_BASE}/api/v5/public/open-interest?instType=SWAP`
  );
  if (!res.ok) throw new Error(`OKX OI: ${res.status}`);
  const data: OkxOIResponse = await res.json();

  if (data.code !== '0') throw new Error(`OKX error: ${data.code}`);

  // We also need prices for OI conversion
  const priceRes = await fetchWithTimeout(
    `${OKX_BASE}/api/v5/market/tickers?instType=SWAP`
  );
  if (!priceRes.ok) throw new Error(`OKX prices: ${priceRes.status}`);
  const priceData = await priceRes.json();
  if (priceData.code !== '0') throw new Error(`OKX price error: ${priceData.code}`);
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
