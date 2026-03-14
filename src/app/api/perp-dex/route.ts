import { NextResponse } from 'next/server';
import { cache } from '@/lib/cache';
import { DEX_FETCHERS, aggregateFunding } from '@/lib/perp-dex';
import type { PerpDexResponse, DexFundingData } from '@/types/perp-dex';

const CACHE_KEY = 'perp-dex-aggregated';
const CACHE_TTL = 60_000; // 60s

export async function GET() {
  const cached = cache.get<PerpDexResponse>(CACHE_KEY);
  if (cached) {
    return NextResponse.json(cached);
  }

  const fetchers = Object.values(DEX_FETCHERS);
  const results = await Promise.allSettled(fetchers.map((fn) => fn()));

  const dexes: DexFundingData[] = results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    const dexNames = Object.keys(DEX_FETCHERS);
    return {
      dex: dexNames[i] as DexFundingData['dex'],
      label: dexNames[i],
      rates: [],
      error: (r.reason as Error)?.message ?? 'Unknown error',
    };
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
