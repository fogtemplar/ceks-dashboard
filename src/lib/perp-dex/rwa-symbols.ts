// RWA (Real World Assets): tokenized stocks, forex, commodities
// Used to filter between Crypto and RWA in the UI
export const RWA_SYMBOLS = new Set([
  // Tokenized stocks
  'AAPL', 'AMZN', 'GOOG', 'GOOGL', 'META', 'MSFT', 'NVDA', 'TSLA',
  'INTC', 'MSTR', 'MU', 'SNDK', 'AMD', 'NFLX', 'COIN', 'GME', 'AMC',
  'PLTR', 'BA', 'DIS', 'UBER', 'ABNB', 'PYPL', 'SQ', 'SHOP', 'SNOW',
  'SPY', 'QQQ', 'IWM',
  // Indices
  'SPX500', 'NDX100', 'DJI',
  // Commodities
  'XAU', 'XAG', 'XPT', 'XPD', // gold, silver, platinum, palladium
  'GOLD', 'SILVER',
  // Forex
  'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD',
  'EURUSD', 'GBPUSD', 'USDJPY',
]);

export function isRWA(symbol: string): boolean {
  const s = symbol.toUpperCase();
  return RWA_SYMBOLS.has(s);
}
