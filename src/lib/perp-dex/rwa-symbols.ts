// RWA (Real World Assets): tokenized stocks, forex, commodities
// Used to filter between Crypto and RWA in the UI
export const RWA_SYMBOLS = new Set([
  // Tokenized stocks (US)
  'AAPL', 'AMZN', 'GOOG', 'GOOGL', 'META', 'MSFT', 'NVDA', 'TSLA',
  'INTC', 'MSTR', 'MU', 'SNDK', 'AMD', 'NFLX', 'COIN', 'GME', 'AMC',
  'PLTR', 'BA', 'DIS', 'UBER', 'ABNB', 'PYPL', 'SQ', 'SHOP', 'SNOW',
  'HOOD', 'ASML',
  'ORCL', 'AVGO', 'TSM', 'CSCO', 'MRVL', 'RDDT', 'APP', 'COHR', 'ARM',
  'IBM', 'GE', 'BRKB', 'JPM', 'MA', 'UNH', 'LLY', 'PEP', 'KO', 'MCD',
  'WMT', 'COST', 'ACN', 'PG', 'JD', 'FUTU', 'GD', 'NOC', 'RTX', 'LMT',
  'COP', 'XOM', 'OXY',
  // Tokenized stocks (CN/HK)
  'BABA',
  // Tokenized stocks (KR)
  'SKHYNIX', 'KRCOMP', 'SAMSUNG', 'HYUNDAI', 'HANMI',
  // ETFs
  'SPY', 'QQQ', 'IWM', 'BOTZ', 'MAGS', 'URA',
  'IAU', 'SLV',                 // iShares gold/silver ETFs
  'EWJ', 'EWY', 'TLT', 'IEFA', 'AGG',
  // Indices
  'SPX500', 'NDX100', 'DJI',
  'NAS100', 'TECH100M', 'SPX500M',
  'JPN225', 'HK50', 'HSCHKD', 'AUS200', 'GER40', 'UK100',
  'US30', 'US2000', 'ES',
  // Volatility
  'VIX', 'BVIX', 'EVIX', 'GVZ',
  // Commodities & precious metals
  'XAU', 'XAG', 'XPT', 'XPD', // gold, silver, platinum, palladium
  'XCU', 'COPPER',              // copper
  'WTI', 'CL', 'XTI', 'XBR',   // oil (WTI, crude, Brent)
  'NATGAS', 'NG', 'XNG',        // natural gas
  'GOLD', 'SILVER',
  'PAXG', 'XAUT',               // gold-backed tokens
  // Forex
  'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD',
  'EURUSD', 'GBPUSD', 'USDJPY', 'NZDUSD',
  'USDCHF', 'USDKRW', 'AUDUSD', 'USDCAD',
]);

export function isRWA(symbol: string): boolean {
  const s = symbol.toUpperCase();
  if (RWA_SYMBOLS.has(s)) return true;
  // Handle suffixed symbols: INTC_24_5, MSTR-25, NVDAX, FUTUON
  const base = s
    .replace(/[_\-]\d.*$/, '')  // strip _24_5 or -25 suffixes
    .replace(/X$/, '')           // strip X suffix (NVDAX → NVDA)
    .replace(/ON$/, '');         // strip ON suffix (FUTUON → FUTU)
  if (base !== s && RWA_SYMBOLS.has(base)) return true;
  return false;
}
