import { COINGECKO_BASE, CACHE_TTL, TOP_COINS_LIMIT, COINGECKO_PAGES } from './constants';
import { cache } from './cache';
import type { CoinSupplyData } from '@/types';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Only fetches circulating supply + name/image from CoinGecko
// Cached for 1 hour since supply barely changes
// MC is calculated: supply × exchange price
export async function fetchCoinSupply(): Promise<Map<string, CoinSupplyData[]>> {
  const cached = cache.get<Map<string, CoinSupplyData[]>>('supply:all');
  if (cached) return cached;

  const result = new Map<string, CoinSupplyData[]>();

  let retries = 0;
  const MAX_RETRIES = 3;

  for (let page = 1; page <= COINGECKO_PAGES; page++) {
    try {
      // Rate limit: pause 1.5s between every request
      if (page > 1) {
        await delay(1500);
      }

      const res = await fetch(
        `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${TOP_COINS_LIMIT}&page=${page}&sparkline=false`,
        { next: { revalidate: 3600 } }
      );

      if (res.status === 429) {
        retries++;
        if (retries > MAX_RETRIES) {
          console.warn(`CoinGecko rate limit: max retries reached at page ${page}, using ${result.size} coins`);
          break;
        }
        console.warn(`CoinGecko rate limited at page ${page}, retry ${retries}/${MAX_RETRIES}...`);
        await delay(5000);
        page--; // retry this page
        continue;
      }

      retries = 0; // reset on success

      if (!res.ok) {
        console.warn(`CoinGecko page ${page}: ${res.status}`);
        break;
      }
      const coins = await res.json();

      if (!coins.length) break; // no more data

      for (const coin of coins) {
        const sym = coin.symbol.toUpperCase();
        const entry: CoinSupplyData = {
          id: coin.id,
          symbol: sym,
          name: coin.name,
          circulatingSupply: coin.circulating_supply ?? 0,
          image: coin.image ?? '',
          cgPrice: coin.current_price ?? 0,
        };
        const arr = result.get(sym);
        if (arr) {
          arr.push(entry);
        } else {
          result.set(sym, [entry]);
        }
      }

      console.log(`CoinGecko page ${page}/${COINGECKO_PAGES}: ${result.size} coins loaded`);
    } catch (err) {
      console.warn(`CoinGecko page ${page} error:`, err);
      break;
    }
  }

  cache.set('supply:all', result, CACHE_TTL.SUPPLY);
  return result;
}
