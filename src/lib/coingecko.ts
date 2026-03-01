import { COINGECKO_BASE, CACHE_TTL, TOP_COINS_LIMIT, COINGECKO_PAGES, COINGECKO_MAX_RETRIES, COINGECKO_PAGE_DELAY, COINGECKO_RETRY_DELAY } from './constants';
import { cache } from './cache';
import { fetchWithTimeout } from './fetch-with-timeout';
import type { CoinSupplyData } from '@/types';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const QUICK_PAGES = 8; // 2000 coins - covers most futures coins

// Internal: fetch N pages from CoinGecko
async function fetchPages(maxPages: number): Promise<Map<string, CoinSupplyData[]>> {
  const result = new Map<string, CoinSupplyData[]>();

  let retries = 0;

  let page = 1;
  while (page <= maxPages) {
    try {
      if (page > 1) {
        await delay(COINGECKO_PAGE_DELAY);
      }

      const res = await fetchWithTimeout(
        `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${TOP_COINS_LIMIT}&page=${page}&sparkline=false`,
        { next: { revalidate: 3600 } } as RequestInit & { timeout?: number }
      );

      if (res.status === 429) {
        retries++;
        if (retries > COINGECKO_MAX_RETRIES) {
          console.warn(`CoinGecko rate limit: max retries reached at page ${page}, using ${result.size} coins`);
          break;
        }
        console.warn(`CoinGecko rate limited at page ${page}, retry ${retries}/${COINGECKO_MAX_RETRIES}...`);
        await delay(COINGECKO_RETRY_DELAY);
        continue; // retry same page
      }

      retries = 0;

      if (!res.ok) {
        console.warn(`CoinGecko page ${page}: ${res.status}`);
        break;
      }
      const coins = await res.json();

      if (!coins.length) break;

      for (const coin of coins) {
        const sym = coin.symbol.toUpperCase();
        const entry: CoinSupplyData = {
          id: coin.id,
          symbol: sym,
          name: coin.name,
          circulatingSupply: coin.circulating_supply ?? 0,
          image: coin.image ?? '',
          cgPrice: coin.current_price ?? 0,
          priceChange24h: coin.price_change_percentage_24h ?? null,
        };
        const arr = result.get(sym);
        if (arr) {
          arr.push(entry);
        } else {
          result.set(sym, [entry]);
        }
      }

      console.log(`CoinGecko page ${page}/${maxPages}: ${result.size} coins loaded`);
      page++;
    } catch (err) {
      console.warn(`CoinGecko page ${page} error:`, err);
      break;
    }
  }

  return result;
}

// Quick fetch: 2 pages (500 coins) for fast initial response
// Used by /api/oi when no full cache exists
export async function fetchCoinSupplyQuick(): Promise<Map<string, CoinSupplyData[]>> {
  // If full cache exists, use that instead
  const full = cache.get<Map<string, CoinSupplyData[]>>('supply:all');
  if (full) return full;

  const quick = cache.get<Map<string, CoinSupplyData[]>>('supply:quick');
  if (quick) return quick;

  const result = await fetchPages(QUICK_PAGES);
  cache.set('supply:quick', result, CACHE_TTL.SUPPLY);
  return result;
}

// Full fetch: all 12 pages (3000 coins)
// Called by /api/supply/warm in background
export async function fetchCoinSupplyFull(): Promise<Map<string, CoinSupplyData[]>> {
  const cached = cache.get<Map<string, CoinSupplyData[]>>('supply:all');
  if (cached) return cached;

  const result = await fetchPages(COINGECKO_PAGES);
  cache.set('supply:all', result, CACHE_TTL.SUPPLY);
  // Also clear quick cache so next /api/oi uses full
  cache.delete('supply:quick');
  return result;
}

// Check if full supply data is cached
export function hasFullSupplyCache(): boolean {
  return cache.get<Map<string, CoinSupplyData[]>>('supply:all') !== null;
}

// Fetch individual coins by CoinGecko ID for coins not found in paginated results
// Used to fill gaps for coins outside the top 3000 that have a known CoinGecko ID
export async function fetchCoinsByIds(
  ids: string[]
): Promise<Map<string, CoinSupplyData>> {
  if (ids.length === 0) return new Map();

  const cacheKey = `supply:byid:${ids.sort().join(',')}`;
  const cached = cache.get<Map<string, CoinSupplyData>>(cacheKey);
  if (cached) return cached;

  const result = new Map<string, CoinSupplyData>();

  try {
    // CoinGecko /coins/markets accepts ids parameter (comma-separated, max ~250)
    const idsParam = ids.slice(0, 100).join(',');
    const res = await fetchWithTimeout(
      `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${idsParam}&sparkline=false`
    );
    if (res.status === 429 || !res.ok) return result;

    const coins = await res.json();
    for (const coin of coins) {
      const sym = coin.symbol.toUpperCase();
      result.set(coin.id, {
        id: coin.id,
        symbol: sym,
        name: coin.name,
        circulatingSupply: coin.circulating_supply ?? 0,
        image: coin.image ?? '',
        cgPrice: coin.current_price ?? 0,
        priceChange24h: coin.price_change_percentage_24h ?? null,
      });
    }

    cache.set(cacheKey, result, CACHE_TTL.SUPPLY);
  } catch (err) {
    console.warn('CoinGecko fetchByIds error:', err);
  }

  return result;
}

// Legacy alias
export const fetchCoinSupply = fetchCoinSupplyQuick;
