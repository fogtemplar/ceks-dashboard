import { fetchWithTimeout } from '../fetch-with-timeout';
import type { DexFundingData, DexFundingRate } from '@/types/perp-dex';

const BASE = 'https://pro.edgex.exchange';
const META_URL = `${BASE}/api/v1/public/meta/getMetaData`;
const FUNDING_URL = `${BASE}/api/v1/public/funding/getLatestFundingRate`;

interface EdgeXContract {
  contractId: string;
  contractName: string;
  baseCoinId: string;
  baseCoin: string;
}

interface EdgeXFunding {
  contractId: string;
  fundingRate: string;
  markPrice: string;
  indexPrice: string;
  fundingRateIntervalMin: string;
  fundingTime: string;
}

export async function fetchEdgeX(): Promise<DexFundingData> {
  try {
    // Get contract list from metadata
    const metaRes = await fetchWithTimeout(META_URL, { timeout: 10000 });
    const metaJson = await metaRes.json();
    const contracts: EdgeXContract[] = metaJson?.data?.contractList ?? [];

    if (contracts.length === 0) {
      return { dex: 'edgex', label: 'EdgeX', rates: [], error: 'No contracts found' };
    }

    // Limit to first 50 contracts to avoid excessive API calls
    const limited = contracts.slice(0, 50);

    // Fetch funding rates in parallel (batched)
    const batchSize = 10;
    const rates: DexFundingRate[] = [];

    for (let i = 0; i < limited.length; i += batchSize) {
      const batch = limited.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (c) => {
          const res = await fetchWithTimeout(
            `${FUNDING_URL}?contractId=${c.contractId}`,
            { timeout: 8000 }
          );
          const json = await res.json();
          const items: EdgeXFunding[] = json?.data ?? [];
          if (items.length === 0) return null;

          const item = items[0];
          const intervalMin = parseInt(item.fundingRateIntervalMin) || 240;
          const intervalHours = intervalMin / 60;
          const ratePerInterval = parseFloat(item.fundingRate);
          if (isNaN(ratePerInterval)) return null;

          let symbol = c.contractName?.replace(/USD$/, '') || '';
          symbol = symbol.replace(/\d+$/, ''); // Remove trailing digits like BNB2 -> BNB

          return {
            symbol,
            fundingRate: ratePerInterval / intervalHours, // normalize to 1h
            fundingIntervalH: intervalHours,
            markPrice: parseFloat(item.markPrice) || null,
            indexPrice: parseFloat(item.indexPrice) || null,
            openInterest: null,
            nextFundingTime: parseInt(item.fundingTime) || null,
          } satisfies DexFundingRate;
        })
      );

      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) rates.push(r.value);
      }
    }

    return { dex: 'edgex', label: 'EdgeX', rates };
  } catch (e) {
    return {
      dex: 'edgex',
      label: 'EdgeX',
      rates: [],
      error: (e as Error).message,
    };
  }
}
