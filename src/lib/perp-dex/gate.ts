import { fetchWithTimeout } from '../fetch-with-timeout';
import type { DexFundingData, DexFundingRate } from '@/types/perp-dex';

const API = 'https://api.gateio.ws/api/v4/futures/usdt/tickers';

interface GateTicker {
  contract: string;
  mark_price: string;
  index_price: string;
  funding_rate: string;
  funding_rate_indicative: string;
}

function symbolFromContract(s: string): string {
  // BTC_USDT -> BTC
  return s.split('_')[0];
}

export async function fetchGate(): Promise<DexFundingData> {
  try {
    const res = await fetchWithTimeout(API, { timeout: 10000 });
    const json = (await res.json()) as GateTicker[];

    const rates: DexFundingRate[] = [];
    for (const item of json) {
      if (!item.contract.endsWith('_USDT')) continue;
      const rate = parseFloat(item.funding_rate);
      if (isNaN(rate)) continue;

      const intervalH = 8; // Gate standard 8h

      rates.push({
        symbol: symbolFromContract(item.contract),
        fundingRate: rate / intervalH, // decimal per 8h -> decimal per 1h
        fundingIntervalH: intervalH,
        markPrice: parseFloat(item.mark_price) || null,
        indexPrice: parseFloat(item.index_price) || null,
        openInterest: null,
        nextFundingTime: null,
      });
    }

    return { dex: 'gate', label: 'Gate', rates };
  } catch (e) {
    return {
      dex: 'gate',
      label: 'Gate',
      rates: [],
      error: (e as Error).message,
    };
  }
}
