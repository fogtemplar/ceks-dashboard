export const BINANCE_FUTURES_BASE = 'https://fapi.binance.com';
export const BYBIT_BASE = 'https://api.bybit.com';
export const OKX_BASE = 'https://www.okx.com';
export const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

export const CACHE_TTL = {
  AGGREGATED_OI: 60_000,
  BINANCE_SYMBOL: 30_000,
  BYBIT_ALL: 60_000,
  OKX_ALL: 60_000,
  MARKET_CAP: 120_000,
  SUPPLY: 3_600_000, // 1 hour - supply barely changes
  HISTORY: 300_000,
  EXCHANGE_INFO: 3_600_000,
  SYMBOL_MAP: 600_000,
} as const;

export const BINANCE_BATCH_CONCURRENCY = 10;
export const TOP_COINS_LIMIT = 250;
export const COINGECKO_PAGES = 12; // 250 x 12 = 3000 coins
