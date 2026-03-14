import { fetchWithTimeout } from '../fetch-with-timeout';
import type { DexFundingData, DexFundingRate } from '@/types/perp-dex';

const API = 'https://fapi.asterdex.com/fapi/v1/premiumIndex';

interface AsterPremium {
  symbol: string;
  lastFundingRate: string;
  markPrice: string;
  indexPrice: string;
  nextFundingTime: number;
  interestRate: string;
}

function normalizeSymbol(s: string): string {
  // Remove USDT/USD suffix
  let sym = s.replace(/USDT?$/, '');
  // Handle 1000PEPE -> PEPE etc
  if (/^\d+/.test(sym)) sym = sym.replace(/^\d+/, '');
  return sym;
}

export async function fetchAster(): Promise<DexFundingData> {
  try {
    const res = await fetchWithTimeout(API, { timeout: 15000 });
    const data = (await res.json()) as AsterPremium[];

    const rates: DexFundingRate[] = [];
    for (const item of data) {
      if (!item.symbol.endsWith('USDT')) continue;
      const rate8h = parseFloat(item.lastFundingRate);
      if (isNaN(rate8h)) continue;

      rates.push({
        symbol: normalizeSymbol(item.symbol),
        fundingRate: rate8h / 8, // 8h -> 1h
        markPrice: parseFloat(item.markPrice) || null,
        indexPrice: parseFloat(item.indexPrice) || null,
        openInterest: null,
        nextFundingTime: item.nextFundingTime || null,
      });
    }

    return { dex: 'aster', label: 'Aster', rates };
  } catch (e) {
    return {
      dex: 'aster',
      label: 'Aster',
      rates: [],
      error: (e as Error).message,
    };
  }
}
