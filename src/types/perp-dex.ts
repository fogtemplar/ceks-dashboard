export type DexName =
  | 'hyperliquid'
  | 'aster'
  | 'edgex'
  | 'lighter'
  | 'grvt'
  | 'variational'
  | 'extended';

export interface DexFundingRate {
  symbol: string;
  fundingRate: number; // normalized to 1h rate
  markPrice: number | null;
  indexPrice: number | null;
  openInterest: number | null;
  nextFundingTime: number | null;
}

export interface DexFundingData {
  dex: DexName;
  label: string;
  rates: DexFundingRate[];
  error?: string;
}

export interface AggregatedFundingRow {
  symbol: string;
  rates: Partial<Record<DexName, number>>; // 1h normalized
  prices: Partial<Record<DexName, number>>;
  bestLong: { dex: DexName; rate: number } | null; // most negative = best for long
  bestShort: { dex: DexName; rate: number } | null; // most positive = best for short
  spread: number; // max - min rate (arb opportunity)
  dexCount: number;
}

export interface PerpDexResponse {
  updatedAt: string;
  dexes: DexFundingData[];
  aggregated: AggregatedFundingRow[];
}
