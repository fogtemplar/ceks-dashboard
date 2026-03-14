import { fetchWithTimeout } from '../fetch-with-timeout';
import type { DexFundingData, DexFundingRate } from '@/types/perp-dex';

const BASE = 'https://market-data.grvt.io';

interface GrvtInstrument {
  instrument: string;
}

interface GrvtFundingEntry {
  instrument: string;
  funding_rate: string;
  mark_price: string;
  funding_interval_hours: number;
}

function symbolFromInstrument(inst: string): string {
  return inst.split('_')[0];
}

export async function fetchGRVT(): Promise<DexFundingData> {
  try {
    // Get all active perp instruments
    const instRes = await fetchWithTimeout(`${BASE}/full/v1/all_instruments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: true }),
      timeout: 10000,
    });
    const instJson = await instRes.json();
    const instruments: GrvtInstrument[] = (instJson?.result ?? []).filter(
      (i: GrvtInstrument) => i.instrument?.endsWith('_Perp')
    );

    // Fetch funding for each instrument in parallel (batched)
    const batchSize = 15;
    const rates: DexFundingRate[] = [];

    for (let i = 0; i < instruments.length; i += batchSize) {
      const batch = instruments.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (inst) => {
          const res = await fetchWithTimeout(`${BASE}/full/v1/funding`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instrument: inst.instrument, limit: 1 }),
            timeout: 8000,
          });
          const json = await res.json();
          const entries: GrvtFundingEntry[] = json?.result ?? [];
          if (entries.length === 0) return null;

          const entry = entries[0];
          const ratePercent = parseFloat(entry.funding_rate);
          if (isNaN(ratePercent)) return null;

          const intervalHours = entry.funding_interval_hours || 8;

          return {
            symbol: symbolFromInstrument(inst.instrument),
            fundingRate: (ratePercent / 100) / intervalHours, // percent per interval -> decimal per 1h
            markPrice: parseFloat(entry.mark_price) || null,
            indexPrice: null,
            openInterest: null,
            nextFundingTime: null,
          } satisfies DexFundingRate;
        })
      );

      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) rates.push(r.value);
      }
    }

    return { dex: 'grvt', label: 'GRVT', rates };
  } catch (e) {
    return {
      dex: 'grvt',
      label: 'GRVT',
      rates: [],
      error: (e as Error).message,
    };
  }
}
