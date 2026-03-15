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

    // Build contract name map
    const contractMap = new Map<string, EdgeXContract>();
    for (const c of contracts) {
      contractMap.set(c.contractId, c);
    }

    // Fetch all funding rates in a single batch call (comma-separated IDs)
    const ids = contracts.map((c) => c.contractId).join(',');
    const fundingRes = await fetchWithTimeout(
      `${FUNDING_URL}?contractId=${ids}`,
      { timeout: 15000 }
    );
    const fundingJson = await fundingRes.json();
    const items: EdgeXFunding[] = fundingJson?.data ?? [];

    const rates: DexFundingRate[] = [];
    for (const item of items) {
      const contract = contractMap.get(item.contractId);
      if (!contract) continue;

      const intervalMin = parseInt(item.fundingRateIntervalMin) || 240;
      const intervalHours = intervalMin / 60;
      const ratePerInterval = parseFloat(item.fundingRate);
      if (isNaN(ratePerInterval)) continue;

      let symbol = contract.contractName?.replace(/USD$/, '') || '';
      symbol = symbol.replace(/\d+$/, ''); // Remove trailing digits like BNB2 -> BNB

      rates.push({
        symbol,
        fundingRate: ratePerInterval / intervalHours, // normalize to 1h
        fundingIntervalH: intervalHours,
        markPrice: parseFloat(item.markPrice) || null,
        indexPrice: parseFloat(item.indexPrice) || null,
        openInterest: null,
        nextFundingTime: (parseInt(item.fundingTime) || 0) + intervalMin * 60_000 || null,
      });
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
