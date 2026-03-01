import type { AggregatedCoinOI } from '@/types';

// Log-scale with 50% ceiling
// At 50% OI/MC ratio → index 100
// Spreads the distribution much wider:
//   0.1% → ~11   1% → ~39   5% → ~63   10% → ~74   20% → ~85   50% → 100
const OI_MC_CEILING = 0.50;
const LOG_K = 1000;
const LOG_DENOM = Math.log(1 + OI_MC_CEILING * LOG_K); // ln(501) ≈ 6.216

export function computeOIMCRatio(totalOI: number, marketCap: number): number {
  if (marketCap <= 0) return 0;
  return totalOI / marketCap;
}

export function computeOIMCIndex(ratio: number): number {
  if (ratio <= 0) return 0;
  const raw = (Math.log(1 + ratio * LOG_K) / LOG_DENOM) * 100;
  return Math.min(100, raw);
}

// Percentile-based enrichment: combines absolute log-score with
// relative rank so coins spread evenly across the full 0-100 range
export function enrichWithOIMC(coins: AggregatedCoinOI[]): AggregatedCoinOI[] {
  // First pass: compute raw ratios and absolute index
  const withRatio = coins.map((coin) => {
    const ratio = computeOIMCRatio(coin.totalOI, coin.marketCap);
    const absIndex = computeOIMCIndex(ratio);
    return { coin, ratio, absIndex };
  });

  // Only rank coins that have valid MC
  const ranked = withRatio
    .filter((c) => c.ratio > 0)
    .sort((a, b) => a.ratio - b.ratio);

  const n = ranked.length;

  // Assign percentile rank (0-100)
  const percentileMap = new Map<string, number>();
  ranked.forEach((item, i) => {
    percentileMap.set(item.coin.symbol, (i / Math.max(1, n - 1)) * 100);
  });

  // Blend: 60% absolute log-scale + 40% percentile rank
  // This keeps absolute meaning while ensuring even spread
  return withRatio.map(({ coin, ratio, absIndex }) => {
    const pct = percentileMap.get(coin.symbol) ?? 0;
    const blended = ratio > 0 ? absIndex * 0.6 + pct * 0.4 : 0;
    const index = Math.min(99.9, Math.round(blended * 100) / 100);

    return {
      ...coin,
      oiMcRatio: ratio,
      oiMcIndex: index,
    };
  });
}

// ── Detailed tier system ──
// 13 tiers for maximum granularity

export interface IndexTier {
  grade: string;
  label: string;
  labelKo: string;
}

const TIERS: { min: number; grade: string; label: string; labelKo: string }[] = [
  { min: 95, grade: 'S+', label: 'Extreme',        labelKo: '극단적' },
  { min: 88, grade: 'S',  label: 'Critical',        labelKo: '심각' },
  { min: 80, grade: 'S-', label: 'Very High',       labelKo: '매우 높음' },
  { min: 72, grade: 'A+', label: 'High',            labelKo: '높음' },
  { min: 64, grade: 'A',  label: 'Above High',      labelKo: '상위' },
  { min: 56, grade: 'A-', label: 'Above Avg',       labelKo: '평균 이상' },
  { min: 48, grade: 'B+', label: 'Moderate-High',   labelKo: '중상' },
  { min: 40, grade: 'B',  label: 'Moderate',         labelKo: '보통' },
  { min: 32, grade: 'B-', label: 'Moderate-Low',    labelKo: '중하' },
  { min: 24, grade: 'C+', label: 'Below Avg',       labelKo: '평균 이하' },
  { min: 16, grade: 'C',  label: 'Low',             labelKo: '낮음' },
  { min: 8,  grade: 'D',  label: 'Very Low',        labelKo: '매우 낮음' },
  { min: 0,  grade: 'F',  label: 'Minimal',         labelKo: '최소' },
];

export function getIndexTier(index: number): IndexTier {
  for (const tier of TIERS) {
    if (index >= tier.min) return tier;
  }
  return TIERS[TIERS.length - 1];
}

// 13-step gradient
export function getIndexColor(index: number): string {
  if (index >= 95) return '#991b1b'; // red-800
  if (index >= 88) return '#dc2626'; // red-600
  if (index >= 80) return '#ef4444'; // red-500
  if (index >= 72) return '#f97316'; // orange-500
  if (index >= 64) return '#f59e0b'; // amber-500
  if (index >= 56) return '#eab308'; // yellow-500
  if (index >= 48) return '#a3e635'; // lime-400
  if (index >= 40) return '#84cc16'; // lime-500
  if (index >= 32) return '#22c55e'; // green-500
  if (index >= 24) return '#10b981'; // emerald-500
  if (index >= 16) return '#14b8a6'; // teal-500
  if (index >= 8)  return '#06b6d4'; // cyan-500
  return '#0ea5e9';                   // sky-500
}

export function getIndexBgColor(index: number): string {
  if (index >= 95) return 'bg-red-800/25 border-red-800/40';
  if (index >= 88) return 'bg-red-500/20 border-red-500/30';
  if (index >= 80) return 'bg-red-500/15 border-red-500/25';
  if (index >= 72) return 'bg-orange-500/20 border-orange-500/30';
  if (index >= 64) return 'bg-amber-500/20 border-amber-500/30';
  if (index >= 56) return 'bg-yellow-500/20 border-yellow-500/30';
  if (index >= 48) return 'bg-lime-400/20 border-lime-400/30';
  if (index >= 40) return 'bg-lime-500/20 border-lime-500/30';
  if (index >= 32) return 'bg-green-500/20 border-green-500/30';
  if (index >= 24) return 'bg-emerald-500/20 border-emerald-500/30';
  if (index >= 16) return 'bg-teal-500/20 border-teal-500/30';
  if (index >= 8)  return 'bg-cyan-500/20 border-cyan-500/30';
  return 'bg-sky-500/20 border-sky-500/30';
}
