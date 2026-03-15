import { fetchWithTimeout } from '../fetch-with-timeout';
import type { DexFundingData, DexFundingRate } from '@/types/perp-dex';

const API = 'https://api.bybit.com/v5/market/tickers?category=linear';

interface BybitTicker {
  symbol: string;
  markPrice: string;
  indexPrice: string;
  fundingRate: string;
  nextFundingTime: string;
}

interface BybitResponse {
  retCode: number;
  result: {
    list: BybitTicker[];
  };
}

function normalizeSymbol(s: string): string {
  let sym = s.replace(/USDT$/, '').replace(/USDC$/, '');
  sym = sym.replace(/^1000/, '');
  return sym;
}

export async function fetchBybit(): Promise<DexFundingData> {
  try {
    const res = await fetchWithTimeout(API, { timeout: 10000 });
    const json = (await res.json()) as BybitResponse;

    const rates: DexFundingRate[] = [];
    for (const item of json.result?.list ?? []) {
      if (!item.symbol.endsWith('USDT')) continue;
      const rate = parseFloat(item.fundingRate);
      if (isNaN(rate)) continue;

      const intervalH = 8; // Bybit standard 8h

      rates.push({
        symbol: normalizeSymbol(item.symbol),
        fundingRate: rate / intervalH, // decimal per 8h -> decimal per 1h
        fundingIntervalH: intervalH,
        markPrice: parseFloat(item.markPrice) || null,
        indexPrice: parseFloat(item.indexPrice) || null,
        openInterest: null,
        nextFundingTime: parseInt(item.nextFundingTime) || null,
      });
    }

    return { dex: 'bybit', label: 'Bybit', rates };
  } catch (e) {
    return {
      dex: 'bybit',
      label: 'Bybit',
      rates: [],
      error: (e as Error).message,
    };
  }
}
