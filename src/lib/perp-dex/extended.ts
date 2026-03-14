import { fetchWithTimeout } from '../fetch-with-timeout';
import type { DexFundingData, DexFundingRate } from '@/types/perp-dex';

const API = 'https://api.starknet.extended.exchange/api/v1/info/markets';

interface ExtendedMarket {
  name: string;
  assetName: string;
  active: boolean;
  status: string;
  marketStats: {
    fundingRate: string;
    nextFundingRate: number;
    markPrice: string;
    indexPrice: string;
    openInterest: string;
  };
}

export async function fetchExtended(): Promise<DexFundingData> {
  try {
    const res = await fetchWithTimeout(API, { timeout: 15000 });
    const json = await res.json();
    const markets: ExtendedMarket[] = json?.data ?? [];

    const rates: DexFundingRate[] = [];
    for (const m of markets) {
      if (!m.active || m.status !== 'ACTIVE') continue;
      const stats = m.marketStats;
      if (!stats) continue;

      const rate = parseFloat(stats.fundingRate);
      if (isNaN(rate)) continue;

      // Extended: funding rate is per-hour, applied hourly
      rates.push({
        symbol: m.assetName,
        fundingRate: rate, // already hourly
        markPrice: parseFloat(stats.markPrice) || null,
        indexPrice: parseFloat(stats.indexPrice) || null,
        openInterest: parseFloat(stats.openInterest) || null,
        nextFundingTime: stats.nextFundingRate || null,
      });
    }

    return { dex: 'extended', label: 'Extended', rates };
  } catch (e) {
    return {
      dex: 'extended',
      label: 'Extended',
      rates: [],
      error: (e as Error).message,
    };
  }
}
