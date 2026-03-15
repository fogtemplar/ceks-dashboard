import { fetchWithTimeout } from '../fetch-with-timeout';
import type { DexFundingData, DexFundingRate } from '@/types/perp-dex';

const API = 'https://api.backpack.exchange/api/v1/markPrices';

interface BackpackMarkPrice {
  symbol: string;
  fundingRate: string;
  markPrice: string;
  indexPrice: string;
  nextFundingTimestamp: number;
}

function symbolFromPair(s: string): string {
  // "BTC_USDC_PERP" -> "BTC"
  return s.split('_')[0];
}

export async function fetchBackpack(): Promise<DexFundingData> {
  try {
    const res = await fetchWithTimeout(API, { timeout: 15000 });
    const json = (await res.json()) as BackpackMarkPrice[];

    const rates: DexFundingRate[] = [];
    for (const item of json) {
      if (!item.symbol.endsWith('_PERP')) continue;
      const rate = parseFloat(item.fundingRate);
      if (isNaN(rate)) continue;

      rates.push({
        symbol: symbolFromPair(item.symbol),
        fundingRate: rate, // already hourly decimal
        fundingIntervalH: 1,
        markPrice: parseFloat(item.markPrice) || null,
        indexPrice: parseFloat(item.indexPrice) || null,
        openInterest: null,
        nextFundingTime: item.nextFundingTimestamp || null,
      });
    }

    return { dex: 'backpack', label: 'Backpack', rates };
  } catch (e) {
    return {
      dex: 'backpack',
      label: 'Backpack',
      rates: [],
      error: (e as Error).message,
    };
  }
}
