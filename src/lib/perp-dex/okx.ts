import { fetchWithTimeout } from '../fetch-with-timeout';
import type { DexFundingData, DexFundingRate } from '@/types/perp-dex';

const INSTRUMENTS_API = 'https://www.okx.com/api/v5/public/instruments?instType=SWAP';
const FUNDING_RATE_API = 'https://www.okx.com/api/v5/public/funding-rate';

interface OkxInstrument {
  instId: string;
  ctType: string;
}

interface OkxFundingRate {
  instId: string;
  fundingRate: string;
  nextFundingRate: string;
  fundingTime: string;
  nextFundingTime: string;
}

interface OkxResponse<T> {
  code: string;
  data: T[];
}

function symbolFromInstId(instId: string): string {
  // BTC-USDT-SWAP -> BTC
  return instId.split('-')[0];
}

export async function fetchOKX(): Promise<DexFundingData> {
  try {
    // Get all SWAP instruments
    const instRes = await fetchWithTimeout(INSTRUMENTS_API, { timeout: 10000 });
    const instJson = (await instRes.json()) as OkxResponse<OkxInstrument>;
    const swaps = (instJson.data ?? []).filter(
      (i) => i.instId.endsWith('-USDT-SWAP') && i.ctType === 'linear'
    );

    const rates: DexFundingRate[] = [];
    const batchSize = 20; // OKX rate limit: 20 req/2s
    const maxInstruments = 100; // Limit to avoid long fetch times
    const limited = swaps.slice(0, maxInstruments);

    for (let i = 0; i < limited.length; i += batchSize) {
      const batch = limited.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (inst) => {
          const res = await fetchWithTimeout(
            `${FUNDING_RATE_API}?instId=${inst.instId}`,
            { timeout: 8000 }
          );
          const json = (await res.json()) as OkxResponse<OkxFundingRate>;
          const data = json.data?.[0];
          if (!data) return null;

          const rate = parseFloat(data.fundingRate);
          if (isNaN(rate)) return null;

          const intervalH = 8; // OKX standard 8h

          return {
            symbol: symbolFromInstId(inst.instId),
            fundingRate: rate / intervalH,
            fundingIntervalH: intervalH,
            markPrice: null,
            indexPrice: null,
            openInterest: null,
            nextFundingTime: parseInt(data.nextFundingTime) || null,
          } satisfies DexFundingRate;
        })
      );

      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) rates.push(r.value);
      }

      // Respect rate limit: wait between batches
      if (i + batchSize < limited.length) {
        await new Promise((resolve) => setTimeout(resolve, 2100));
      }
    }

    return { dex: 'okx', label: 'OKX', rates };
  } catch (e) {
    return {
      dex: 'okx',
      label: 'OKX',
      rates: [],
      error: (e as Error).message,
    };
  }
}
