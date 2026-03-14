import { fetchWithTimeout } from '../fetch-with-timeout';
import type { DexFundingData, DexFundingRate } from '@/types/perp-dex';

const PREMIUM_API = 'https://fapi.asterdex.com/fapi/v3/premiumIndex';
const FUNDING_INFO_API = 'https://fapi.asterdex.com/fapi/v3/fundingInfo';

interface AsterPremium {
  symbol: string;
  lastFundingRate: string;
  markPrice: string;
  indexPrice: string;
  nextFundingTime: number;
}

interface AsterFundingInfo {
  symbol: string;
  fundingIntervalHours: number;
}

function normalizeSymbol(s: string): string {
  let sym = s.replace(/USDT?$/, '');
  if (/^\d+/.test(sym)) sym = sym.replace(/^\d+/, '');
  return sym;
}

export async function fetchAster(): Promise<DexFundingData> {
  try {
    const [premiumRes, infoRes] = await Promise.all([
      fetchWithTimeout(PREMIUM_API, { timeout: 15000 }),
      fetchWithTimeout(FUNDING_INFO_API, { timeout: 15000 }),
    ]);
    const premiums = (await premiumRes.json()) as AsterPremium[];
    const infos = (await infoRes.json()) as AsterFundingInfo[];

    // Build interval map: symbol -> hours
    const intervalMap = new Map<string, number>();
    for (const info of infos) {
      intervalMap.set(info.symbol, info.fundingIntervalHours);
    }

    const rates: DexFundingRate[] = [];
    for (const item of premiums) {
      if (!item.symbol.endsWith('USDT')) continue;
      const rate = parseFloat(item.lastFundingRate);
      if (isNaN(rate)) continue;

      const intervalHours = intervalMap.get(item.symbol) ?? 8;

      rates.push({
        symbol: normalizeSymbol(item.symbol),
        fundingRate: rate / intervalHours, // per-interval decimal -> 1h
        fundingIntervalH: intervalHours,
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
