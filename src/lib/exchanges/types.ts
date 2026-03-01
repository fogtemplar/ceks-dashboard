export interface ExchangeOIResult {
  symbol: string; // canonical e.g. "BTC"
  oiUsd: number;
}

export type ExchangeOIMap = Map<string, number>; // canonical -> oiUsd
export type PriceMap = Map<string, number>; // canonical -> price in USD
