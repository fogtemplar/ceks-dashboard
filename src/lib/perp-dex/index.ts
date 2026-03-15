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
import { fetchBackpack } from './backpack';
import { fetchBinance } from './binance';
import { fetchBybit } from './bybit';
import { fetchOKX } from './okx';
import { fetchBitget } from './bitget';
import { fetchGate } from './gate';

export const DEX_FETCHERS: Record<DexName, () => Promise<DexFundingData>> = {
  // CEX
  binance: fetchBinance,
  okx: fetchOKX,
  bybit: fetchBybit,
  bitget: fetchBitget,
  gate: fetchGate,
  // DEX
  hyperliquid: fetchHyperliquid,
  lighter: fetchLighter,
  aster: fetchAster,
  backpack: fetchBackpack,
  edgex: fetchEdgeX,
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
      intervals: Partial<Record<DexName, number>>;
      prices: Partial<Record<DexName, number>>;
    }
  >();

  for (const dex of dexes) {
    for (const r of dex.rates) {
      const sym = r.symbol.toUpperCase();
      if (!symbolMap.has(sym)) {
        symbolMap.set(sym, { rates: {}, intervals: {}, prices: {} });
      }
      const entry = symbolMap.get(sym)!;
      entry.rates[dex.dex] = r.fundingRate;
      entry.intervals[dex.dex] = r.fundingIntervalH;
      if (r.markPrice) entry.prices[dex.dex] = r.markPrice;
    }
  }

  const rows: AggregatedFundingRow[] = [];

  for (const [symbol, { rates, intervals, prices }] of symbolMap) {
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
      intervals,
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
