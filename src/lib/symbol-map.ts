import { cache } from './cache';
import { CACHE_TTL } from './constants';
import type { CoinSupplyData } from '@/types';

const CANONICAL_TO_COINGECKO: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  ADA: 'cardano',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  POL: 'matic-network',
  LINK: 'chainlink',
  UNI: 'uniswap',
  ATOM: 'cosmos',
  LTC: 'litecoin',
  FIL: 'filecoin',
  APT: 'aptos',
  ARB: 'arbitrum',
  OP: 'optimism',
  SUI: 'sui',
  SEI: 'sei-network',
  TIA: 'celestia',
  INJ: 'injective-protocol',
  NEAR: 'near',
  PEPE: 'pepe',
  '1000PEPE': 'pepe',
  WIF: 'dogwifcoin',
  SHIB: 'shiba-inu',
  '1000SHIB': 'shiba-inu',
  BCH: 'bitcoin-cash',
  TRX: 'tron',
  TON: 'the-open-network',
  HBAR: 'hedera-hashgraph',
  ICP: 'internet-computer',
  RENDER: 'render-token',
  FET: 'fetch-ai',
  STX: 'blockstack',
  IMX: 'immutable-x',
  MKR: 'maker',
  GRT: 'the-graph',
  AAVE: 'aave',
  ALGO: 'algorand',
  FTM: 'fantom',
  SAND: 'the-sandbox',
  MANA: 'decentraland',
  AXS: 'axie-infinity',
  THETA: 'theta-token',
  EOS: 'eos',
  FLOW: 'flow',
  XTZ: 'tezos',
  CFX: 'conflux-token',
  DYDX: 'dydx',
  BONK: 'bonk',
  '1000BONK': 'bonk',
  FLOKI: 'floki',
  '1000FLOKI': 'floki',
  JUP: 'jupiter-exchange-solana',
  W: 'wormhole',
  ENA: 'ethena',
  PENDLE: 'pendle',
  JTO: 'jito-governance-token',
  PYTH: 'pyth-network',
  WLD: 'worldcoin-wld',
  STRK: 'starknet',
  ORDI: 'ordinals',
  TAO: 'bittensor',
  CRV: 'curve-dao-token',
  RUNE: 'thorchain',
  SNX: 'havven',
  COMP: 'compound-governance-token',
  LDO: 'lido-dao',
  RPL: 'rocket-pool',
  GMX: 'gmx',
  ENS: 'ethereum-name-service',
  BLUR: 'blur',
  AGI: 'singularitynet',
  RNDR: 'render-token',
  AR: 'arweave',
  GALA: 'gala',
  APE: 'apecoin',
  CKB: 'nervos-network',
  ZK: 'zksync',
  EIGEN: 'eigenlayer',
  TRUMP: 'official-trump',
  // Commonly traded futures coins outside CoinGecko top 500
  ARC: 'ai-rig-complex',
  BEAT: 'audiera',
  ENSO: 'enso',
  PARTI: 'particle-network',
  HOLO: 'holoworld',
  AGLD: 'adventure-gold',
  ELSA: 'elsa',
  ZKP: 'zkpass',
  SPACE: 'spacecoin-2',
  SONIC: 'sonic-svm',
  WCT: 'connect-token-wct',
  FIO: 'fio-protocol',
  HANA: 'hana-network',
  BULLA: 'bulla-3',
  PTB: 'portal-to-bitcoin',
  LAYER: 'solayer',
  SKY: 'sky',
  DYDX: 'dydx-chain',
};

let dynamicMap: Record<string, string> | null = null;

// Build symbol map from supply data (no extra CoinGecko call needed)
export function buildSymbolMapFromSupply(supplyMap: Map<string, CoinSupplyData[]>): Record<string, string> {
  const cached = cache.get<Record<string, string>>('symbolMap:coingecko');
  if (cached) return cached;

  const map: Record<string, string> = { ...CANONICAL_TO_COINGECKO };
  for (const [sym, entries] of supplyMap) {
    if (!map[sym] && entries.length > 0) {
      map[sym] = entries[0].id; // first = highest MC
    }
  }

  dynamicMap = map;
  cache.set('symbolMap:coingecko', map, CACHE_TTL.SYMBOL_MAP);
  return map;
}

// Fallback: return static map without API call
export function getSymbolMap(): Record<string, string> {
  return dynamicMap ?? CANONICAL_TO_COINGECKO;
}

export function binanceToCanonical(symbol: string): string {
  return symbol.replace(/USDT$/, '');
}

export function bybitToCanonical(symbol: string): string {
  return symbol.replace(/USDT$/, '');
}

export function okxToCanonical(instId: string): string {
  return instId.split('-')[0];
}

export function canonicalToCoinGeckoId(
  canonical: string,
  map?: Record<string, string>
): string | null {
  const lookup = map ?? dynamicMap ?? CANONICAL_TO_COINGECKO;
  return lookup[canonical] ?? null;
}

// Normalize 1000PEPE -> PEPE for market cap matching
export function normalizeMultiplierSymbol(symbol: string): {
  base: string;
  multiplier: number;
} {
  const match = symbol.match(/^(\d+)(.+)$/);
  if (match) {
    return { base: match[2], multiplier: parseInt(match[1], 10) };
  }
  return { base: symbol, multiplier: 1 };
}
