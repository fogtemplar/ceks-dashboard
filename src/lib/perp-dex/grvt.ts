import { fetchWithTimeout } from '../fetch-with-timeout';
import type { DexFundingData, DexFundingRate } from '@/types/perp-dex';

const BASE = 'https://edge.grvt.io';

const INSTRUMENTS = [
  'BTC_USDT_Perp',
  'ETH_USDT_Perp',
  'SOL_USDT_Perp',
  'SUI_USDT_Perp',
  'XRP_USDT_Perp',
  'DOGE_USDT_Perp',
  'BNB_USDT_Perp',
  'ADA_USDT_Perp',
  'AVAX_USDT_Perp',
  'LINK_USDT_Perp',
  'ARB_USDT_Perp',
  'OP_USDT_Perp',
  'APT_USDT_Perp',
  'NEAR_USDT_Perp',
  'WIF_USDT_Perp',
];

function symbolFromInstrument(inst: string): string {
  return inst.split('_')[0];
}

interface GrvtFundingEntry {
  funding_rate: string;
  mark_price: string;
  oracle_price?: string;
  timestamp: string;
}

export async function fetchGRVT(): Promise<DexFundingData> {
  try {
    const results = await Promise.allSettled(
      INSTRUMENTS.map(async (inst) => {
        const res = await fetchWithTimeout(`${BASE}/full/v1/funding`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instrument: inst, limit: 1 }),
          timeout: 8000,
        });
        const json = await res.json();
        const entries: GrvtFundingEntry[] = json?.result ?? [];
        if (entries.length === 0) return null;

        const entry = entries[0];
        // GRVT supports 1h/4h/8h per market, rate is per-interval
        // We normalize assuming 8h default
        const rate = parseFloat(entry.funding_rate);
        if (isNaN(rate)) return null;

        return {
          symbol: symbolFromInstrument(inst),
          fundingRate: rate / 8, // assume 8h -> 1h
          markPrice: parseFloat(entry.mark_price) || null,
          indexPrice: entry.oracle_price ? parseFloat(entry.oracle_price) : null,
          openInterest: null,
          nextFundingTime: null,
        } satisfies DexFundingRate;
      })
    );

    const rates: DexFundingRate[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) rates.push(r.value);
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
