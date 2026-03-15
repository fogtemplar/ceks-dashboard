// RWA (Real World Assets): tokenized stocks, forex, commodities
// Used to filter between Crypto and RWA in the UI
export const RWA_SYMBOLS = new Set([
  // Tokenized stocks (US)
  'AAPL', 'AMZN', 'GOOG', 'GOOGL', 'META', 'MSFT', 'NVDA', 'TSLA',
  'INTC', 'MSTR', 'MU', 'SNDK', 'AMD', 'NFLX', 'COIN', 'GME', 'AMC',
  'PLTR', 'BA', 'DIS', 'UBER', 'ABNB', 'PYPL', 'SQ', 'SHOP', 'SNOW',
  'HOOD', 'ASML',
  // Tokenized stocks (KR)
  'SKHYNIX', 'KRCOMP',
  // ETFs & Indices
  'SPY', 'QQQ', 'IWM', 'BOTZ', 'MAGS', 'URA',
  'SPX500', 'NDX100', 'DJI',
  // Commodities & precious metals
  'XAU', 'XAG', 'XPT', 'XPD', // gold, silver, platinum, palladium
  'XCU',                        // copper
  'WTI',                        // oil
  'GOLD', 'SILVER', 'PAXG',    // PAXG = gold-backed token
  // Forex
  'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD',
  'EURUSD', 'GBPUSD', 'USDJPY', 'NZDUSD',
]);

export function isRWA(symbol: string): boolean {
  const s = symbol.toUpperCase();
  if (RWA_SYMBOLS.has(s)) return true;
  // Handle suffixed symbols like INTC_24_5, MSTR_24_5
  const base = s.replace(/[_\-]\d.*$/, '');
  if (base !== s && RWA_SYMBOLS.has(base)) return true;
  return false;
}
