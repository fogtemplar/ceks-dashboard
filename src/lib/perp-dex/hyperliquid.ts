import { fetchWithTimeout } from '../fetch-with-timeout';
import type { DexFundingData, DexFundingRate } from '@/types/perp-dex';

const API = 'https://api.hyperliquid.xyz/info';

interface HlMeta {
  name: string;
  isDelisted?: boolean;
}

interface HlAssetCtx {
  funding: string;
  openInterest: string;
  oraclePx: string;
  markPx: string;
}

export async function fetchHyperliquid(): Promise<DexFundingData> {
  try {
    const res = await fetchWithTimeout(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
      timeout: 15000,
    });
    const [meta, ctxs] = (await res.json()) as [
      { universe: HlMeta[] },
      HlAssetCtx[],
    ];

    const rates: DexFundingRate[] = [];
    for (let i = 0; i < meta.universe.length; i++) {
      const m = meta.universe[i];
      if (m.isDelisted) continue;
      const c = ctxs[i];
      const hourlyRate = parseFloat(c.funding);
      if (isNaN(hourlyRate)) continue;

      let symbol = m.name;
      if (symbol.startsWith('k')) symbol = symbol.slice(1);

      rates.push({
        symbol,
        fundingRate: hourlyRate, // already hourly
        markPrice: parseFloat(c.markPx) || null,
        indexPrice: parseFloat(c.oraclePx) || null,
        openInterest: parseFloat(c.openInterest) || null,
        nextFundingTime: null,
      });
    }

    return { dex: 'hyperliquid', label: 'Hyperliquid', rates };
  } catch (e) {
    return {
      dex: 'hyperliquid',
      label: 'Hyperliquid',
      rates: [],
      error: (e as Error).message,
    };
  }
}
