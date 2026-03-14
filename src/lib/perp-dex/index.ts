import type {
  DexFundingData,
  DexName,
  AggregatedFundingRow,
} from '@/types/perp-dex';
import { fetchHyperliquid } from './hyperliquid';
import { fetchAster } from './aster';
import { fetchEdgeX } from './edgex';
import { fetchLighter } from './lighter';
import { fetchGRVT } from './grvt';
import { fetchVariational } from './variational';
import { fetchExtended } from './extended';

export const DEX_FETCHERS: Record<DexName, () => Promise<DexFundingData>> = {
  hyperliquid: fetchHyperliquid,
  aster: fetchAster,
  edgex: fetchEdgeX,
  lighter: fetchLighter,
  grvt: fetchGRVT,
  variational: fetchVariational,
  extended: fetchExtended,
};

export function aggregateFunding(
  dexes: DexFundingData[]
): AggregatedFundingRow[] {
  // Build map: symbol -> { dex -> rate, dex -> price }
  const symbolMap = new Map<
    string,
    {
      rates: Partial<Record<DexName, number>>;
      prices: Partial<Record<DexName, number>>;
    }
  >();

  for (const dex of dexes) {
    for (const r of dex.rates) {
      const sym = r.symbol.toUpperCase();
      if (!symbolMap.has(sym)) {
        symbolMap.set(sym, { rates: {}, prices: {} });
      }
      const entry = symbolMap.get(sym)!;
      entry.rates[dex.dex] = r.fundingRate;
      if (r.markPrice) entry.prices[dex.dex] = r.markPrice;
    }
  }

  const rows: AggregatedFundingRow[] = [];

  for (const [symbol, { rates, prices }] of symbolMap) {
    const dexEntries = Object.entries(rates) as [DexName, number][];
    if (dexEntries.length === 0) continue;

    let bestLong: { dex: DexName; rate: number } | null = null;
    let bestShort: { dex: DexName; rate: number } | null = null;
    let minRate = Infinity;
    let maxRate = -Infinity;

    for (const [dex, rate] of dexEntries) {
      if (rate < minRate) {
        minRate = rate;
        bestLong = { dex, rate };
      }
      if (rate > maxRate) {
        maxRate = rate;
        bestShort = { dex, rate };
      }
    }

    rows.push({
      symbol,
      rates,
      prices,
      bestLong,
      bestShort,
      spread: dexEntries.length >= 2 ? maxRate - minRate : 0,
      dexCount: dexEntries.length,
    });
  }

  // Sort by spread (arb opportunity) descending
  rows.sort((a, b) => b.spread - a.spread);

  return rows;
}
