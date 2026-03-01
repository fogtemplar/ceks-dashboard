export interface ExchangeOI {
  exchange: 'binance' | 'bybit' | 'okx' | 'bitget';
  symbol: string;
  oiUsd: number;
  timestamp: number;
}

export interface AggregatedCoinOI {
  symbol: string;
  name: string;
  coingeckoId: string;
  image: string;
  price: number;
  marketCap: number;
  totalOI: number;
  oiByExchange: {
    binance: number | null;
    bybit: number | null;
    okx: number | null;
    bitget: number | null;
  };
  oiChange1h: number | null;
  oiChange6h: number | null;
  oiChange24h: number | null;
  oiMcIndex: number;
  oiMcRatio: number;
  priceChange1h: number | null;
  priceChange6h: number | null;
  priceChange24h: number | null;
}

export interface OIHistoryPoint {
  timestamp: number;
  binance: number | null;
  bybit: number | null;
  okx: number | null;
  total: number;
  price: number | null;
}

export interface MarketCapData {
  id: string;
  symbol: string;
  name: string;
  market_cap: number;
  current_price: number;
  image: string;
  price_change_percentage_24h: number;
}

// Supply data from CoinGecko (cached for 1 hour)
export interface CoinSupplyData {
  id: string;
  symbol: string;
  name: string;
  circulatingSupply: number;
  image: string;
  cgPrice: number; // CoinGecko price for symbol disambiguation
  priceChange24h: number | null;
}

export interface DashboardResponse {
  updatedAt: string;
  data: AggregatedCoinOI[];
  isPartial?: boolean; // true when only quick CoinGecko data loaded
}

export type SortField =
  | 'symbol'
  | 'price'
  | 'marketCap'
  | 'totalOI'
  | 'oiChange1h'
  | 'oiChange6h'
  | 'oiChange24h'
  | 'oiMcIndex'
  | 'oiMcRatio';

export type SortDirection = 'asc' | 'desc';
