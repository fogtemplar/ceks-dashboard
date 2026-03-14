import { fetchWithTimeout } from '../fetch-with-timeout';
import type { DexFundingData, DexFundingRate } from '@/types/perp-dex';

const API = 'https://mainnet.zklighter.elliot.ai/api/v1/funding-rates';

interface LighterFundingRate {
  market_id: number;
  exchange: string;
  symbol: string;
  rate: number;
}

export async function fetchLighter(): Promise<DexFundingData> {
  try {
    const res = await fetchWithTimeout(API, { timeout: 15000 });
    const json = await res.json();
    const items: LighterFundingRate[] = json?.funding_rates ?? [];

    // Only keep Lighter's own rates
    const lighterRates = items.filter((r) => r.exchange === 'lighter');

    const rates: DexFundingRate[] = lighterRates.map((item) => ({
      symbol: item.symbol,
      fundingRate: item.rate, // already hourly (clamped [-0.5%, +0.5%] per hour)
      fundingIntervalH: 1,
      markPrice: null,
      indexPrice: null,
      openInterest: null,
      nextFundingTime: null,
    }));

    return { dex: 'lighter', label: 'Lighter', rates };
  } catch (e) {
    return {
      dex: 'lighter',
      label: 'Lighter',
      rates: [],
      error: (e as Error).message,
    };
  }
}
