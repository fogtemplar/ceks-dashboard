import { fetchWithTimeout } from '../fetch-with-timeout';
import type { DexFundingData, DexFundingRate } from '@/types/perp-dex';

const API =
  'https://omni-client-api.prod.ap-northeast-1.variational.io/metadata/stats';

const HOURS_PER_YEAR = 365.25 * 24; // 8766

interface VarListing {
  ticker: string;
  mark_price: string;
  funding_rate: string;
  funding_interval_s: number;
  open_interest: {
    long_open_interest: string;
    short_open_interest: string;
  };
}

interface VarStatsResponse {
  listings: VarListing[];
}

export async function fetchVariational(): Promise<DexFundingData> {
  try {
    const res = await fetchWithTimeout(API, { timeout: 15000 });
    const json = (await res.json()) as VarStatsResponse;

    const rates: DexFundingRate[] = [];
    for (const listing of json.listings ?? []) {
      const intervalHours = (listing.funding_interval_s || 3600) / 3600;
      const annualizedRate = parseFloat(listing.funding_rate);
      if (isNaN(annualizedRate)) continue;

      const longOI = parseFloat(listing.open_interest?.long_open_interest) || 0;
      const shortOI =
        parseFloat(listing.open_interest?.short_open_interest) || 0;

      rates.push({
        symbol: listing.ticker,
        fundingRate: annualizedRate / HOURS_PER_YEAR, // annualized decimal -> decimal per 1h
        fundingIntervalH: intervalHours,
        markPrice: parseFloat(listing.mark_price) || null,
        indexPrice: null,
        openInterest: longOI + shortOI || null,
        nextFundingTime: null,
      });
    }

    return { dex: 'variational', label: 'Variational', rates };
  } catch (e) {
    return {
      dex: 'variational',
      label: 'Variational',
      rates: [],
      error: (e as Error).message,
    };
  }
}
