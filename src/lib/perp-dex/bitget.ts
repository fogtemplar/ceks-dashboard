import { fetchWithTimeout } from '../fetch-with-timeout';
import type { DexFundingData, DexFundingRate } from '@/types/perp-dex';

const TICKERS_API =
  'https://api.bitget.com/api/v2/mix/market/tickers?productType=USDT-FUTURES';
const FUND_RATE_API =
  'https://api.bitget.com/api/v2/mix/market/current-fund-rate?productType=USDT-FUTURES';

interface BitgetTicker {
  symbol: string;
  markPrice: string;
  indexPrice: string;
  fundingRate: string;
  open24h: string;
}

interface BitgetFundRate {
  symbol: string;
  fundingRate: string;
  nextUpdate: string;
}

interface BitgetResponse<T> {
  code: string;
  data: T[];
}

function normalizeSymbol(s: string): string {
  let sym = s.replace(/USDT$/, '');
  sym = sym.replace(/^1000/, '');
  return sym;
}

export async function fetchBitget(): Promise<DexFundingData> {
  try {
    const [tickersRes, fundRateRes] = await Promise.all([
      fetchWithTimeout(TICKERS_API, { timeout: 10000 }),
      fetchWithTimeout(FUND_RATE_API, { timeout: 10000 }),
    ]);

    const tickersJson = (await tickersRes.json()) as BitgetResponse<BitgetTicker>;
    const fundRateJson = (await fundRateRes.json()) as BitgetResponse<BitgetFundRate>;

    // Build next funding time map
    const nextTimeMap = new Map<string, number>();
    for (const fr of fundRateJson.data ?? []) {
      nextTimeMap.set(fr.symbol, parseInt(fr.nextUpdate) || 0);
    }

    const rates: DexFundingRate[] = [];
    for (const item of tickersJson.data ?? []) {
      if (!item.symbol.endsWith('USDT')) continue;
      const rate = parseFloat(item.fundingRate);
      if (isNaN(rate)) continue;

      const intervalH = 8; // Bitget standard 8h

      rates.push({
        symbol: normalizeSymbol(item.symbol),
        fundingRate: rate / intervalH, // decimal per 8h -> decimal per 1h
        fundingIntervalH: intervalH,
        markPrice: parseFloat(item.markPrice) || null,
        indexPrice: parseFloat(item.indexPrice) || null,
        openInterest: null,
        nextFundingTime: nextTimeMap.get(item.symbol) || null,
      });
    }

    return { dex: 'bitget', label: 'Bitget', rates };
  } catch (e) {
    return {
      dex: 'bitget',
      label: 'Bitget',
      rates: [],
      error: (e as Error).message,
    };
  }
}
