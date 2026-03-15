import { fetchWithTimeout } from '../fetch-with-timeout';
import type { DexFundingData, DexFundingRate } from '@/types/perp-dex';

const PREMIUM_INDEX_API = 'https://fapi.binance.com/fapi/v1/premiumIndex';
const FUNDING_INFO_API = 'https://fapi.binance.com/fapi/v1/fundingInfo';

interface BinancePremiumIndex {
  symbol: string;
  markPrice: string;
  indexPrice: string;
  lastFundingRate: string;
  nextFundingTime: number;
  interestRate: string;
}

interface BinanceFundingInfo {
  symbol: string;
  fundingIntervalHours: number;
}

function normalizeSymbol(s: string): string {
  // BTCUSDT -> BTC, 1000PEPEUSDT -> PEPE
  let sym = s.replace(/USDT$/, '').replace(/USDC$/, '');
  sym = sym.replace(/^1000/, '');
  return sym;
}

export async function fetchBinance(): Promise<DexFundingData> {
  try {
    const [premiumRes, fundingInfoRes] = await Promise.all([
      fetchWithTimeout(PREMIUM_INDEX_API, { timeout: 10000 }),
      fetchWithTimeout(FUNDING_INFO_API, { timeout: 10000 }),
    ]);

    const premiumData = (await premiumRes.json()) as BinancePremiumIndex[];
    const fundingInfoData = (await fundingInfoRes.json()) as BinanceFundingInfo[];

    // Build interval map
    const intervalMap = new Map<string, number>();
    for (const info of fundingInfoData) {
      intervalMap.set(info.symbol, info.fundingIntervalHours);
    }

    const rates: DexFundingRate[] = [];
    for (const item of premiumData) {
      if (!item.symbol.endsWith('USDT')) continue;
      const rate = parseFloat(item.lastFundingRate);
      if (isNaN(rate)) continue;

      const intervalH = intervalMap.get(item.symbol) ?? 8;

      rates.push({
        symbol: normalizeSymbol(item.symbol),
        fundingRate: rate / intervalH, // decimal per interval -> decimal per 1h
        fundingIntervalH: intervalH,
        markPrice: parseFloat(item.markPrice) || null,
        indexPrice: parseFloat(item.indexPrice) || null,
        openInterest: null,
        nextFundingTime: item.nextFundingTime || null,
      });
    }

    return { dex: 'binance', label: 'Binance', rates };
  } catch (e) {
    return {
      dex: 'binance',
      label: 'Binance',
      rates: [],
      error: (e as Error).message,
    };
  }
}
