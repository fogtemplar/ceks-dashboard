import { NextResponse } from 'next/server';
import { cache } from '@/lib/cache';
import { DEX_FETCHERS, aggregateFunding } from '@/lib/perp-dex';
import type { PerpDexResponse, DexFundingData } from '@/types/perp-dex';

const CACHE_KEY = 'perp-dex-aggregated';
const CACHE_TTL = 60_000; // 60s

/** Compute next funding time from interval (e.g. 8h -> 00:00/08:00/16:00 UTC) */
function computeNextFunding(intervalH: number): number {
  const now = Date.now();
  const intervalMs = intervalH * 3600_000;
  // Funding times are aligned to epoch (00:00 UTC)
  const next = Math.ceil(now / intervalMs) * intervalMs;
  return next;
}

export async function GET() {
  const cached = cache.get<PerpDexResponse>(CACHE_KEY);
  if (cached) {
    return NextResponse.json(cached);
  }

  const fetchers = Object.values(DEX_FETCHERS);
  const results = await Promise.allSettled(fetchers.map((fn) => fn()));

  const dexes: DexFundingData[] = results.map((r, i) => {
    const dexNames = Object.keys(DEX_FETCHERS);
    if (r.status !== 'fulfilled') {
      return {
        dex: dexNames[i] as DexFundingData['dex'],
        label: dexNames[i],
        rates: [],
        error: (r.reason as Error)?.message ?? 'Unknown error',
      };
    }
    const data = r.value;
    // Compute next funding time: use the most common one across pairs
    const now = Date.now();
    const futureTimes = data.rates
      .map((r) => r.nextFundingTime)
      .filter((t): t is number => t !== null && t > now);
    if (futureTimes.length > 0) {
      // Round to nearest minute to group similar times, then pick the mode
      const buckets = new Map<number, number>();
      for (const t of futureTimes) {
        const rounded = Math.round(t / 60_000) * 60_000;
        buckets.set(rounded, (buckets.get(rounded) ?? 0) + 1);
      }
      let bestTime = futureTimes[0];
      let bestCount = 0;
      for (const [t, count] of buckets) {
        if (count > bestCount) {
          bestCount = count;
          bestTime = t;
        }
      }
      data.nextFundingTime = bestTime;
    } else if (data.rates.length > 0) {
      // Fallback: compute from most common funding interval
      const intervals = data.rates.map((r) => r.fundingIntervalH);
      const mode = intervals.sort(
        (a, b) =>
          intervals.filter((v) => v === b).length -
          intervals.filter((v) => v === a).length
      )[0];
      if (mode) {
        data.nextFundingTime = computeNextFunding(mode);
      }
    }
    return data;
  });

  const aggregated = aggregateFunding(dexes);

  const response: PerpDexResponse = {
    updatedAt: new Date().toISOString(),
    dexes,
    aggregated,
  };

  cache.set(CACHE_KEY, response, CACHE_TTL);

  return NextResponse.json(response);
}
