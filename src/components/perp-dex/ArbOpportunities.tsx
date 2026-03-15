'use client';

import { useState, useMemo } from 'react';
import type { AggregatedFundingRow, DexName } from '@/types/perp-dex';
import { isRWA } from '@/lib/perp-dex/rwa-symbols';

const DEX_COLORS: Record<DexName, string> = {
  binance: 'text-yellow-400',
  bybit: 'text-orange-300',
  okx: 'text-white',
  bitget: 'text-teal-400',
  gate: 'text-blue-300',
  hyperliquid: 'text-emerald-400',
  aster: 'text-blue-400',
  backpack: 'text-red-400',
  edgex: 'text-purple-400',
  lighter: 'text-cyan-400',
  grvt: 'text-amber-400',
  variational: 'text-pink-400',
  extended: 'text-orange-400',
};

const DEX_LABELS: Record<DexName, string> = {
  binance: 'Binance',
  bybit: 'Bybit',
  okx: 'OKX',
  bitget: 'Bitget',
  gate: 'Gate',
  hyperliquid: 'Hyperliquid',
  aster: 'Aster',
  backpack: 'Backpack',
  edgex: 'EdgeX',
  lighter: 'Lighter',
  grvt: 'GRVT',
  variational: 'Variational',
  extended: 'Extended',
};

const ALL_DEXES: DexName[] = [
  'binance', 'bybit', 'okx', 'bitget', 'gate',
  'hyperliquid', 'aster', 'backpack', 'edgex', 'lighter',
  'grvt', 'variational', 'extended',
];

function fmtRate(rate: number): string {
  return `${(rate * 100).toFixed(4)}%`;
}

function fmtAnnual(hourlyRate: number): string {
  const annual = hourlyRate * 8760 * 100;
  return `${annual >= 0 ? '+' : ''}${annual.toFixed(1)}%`;
}

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

interface ArbRow {
  symbol: string;
  longDex: DexName;
  longRate: number;
  shortDex: DexName;
  shortRate: number;
  spread: number;
  dexCount: number;
}

export function ArbOpportunities({
  rows,
}: {
  rows: AggregatedFundingRow[];
}) {
  const [selectedDexes, setSelectedDexes] = useState<DexName[]>([]);
  const [assetFilter, setAssetFilter] = useState<'all' | 'crypto' | 'rwa'>('all');
  const [capital, setCapital] = useState('1000');
  const [leverage, setLeverage] = useState('1');

  const toggleDex = (dex: DexName) => {
    setSelectedDexes((prev) => {
      if (prev.includes(dex)) return prev.filter((d) => d !== dex);
      if (prev.length >= 2) return [prev[1], dex];
      return [...prev, dex];
    });
  };

  const arbRows = useMemo(() => {
    const results: ArbRow[] = [];

    for (const row of rows) {
      if (row.dexCount < 2) continue;
      if (assetFilter === 'crypto' && isRWA(row.symbol)) continue;
      if (assetFilter === 'rwa' && !isRWA(row.symbol)) continue;

      if (selectedDexes.length === 2) {
        // 2 selected: compare only those two
        const [a, b] = selectedDexes;
        const rateA = row.rates[a];
        const rateB = row.rates[b];
        if (rateA === undefined || rateB === undefined) continue;

        const longDex = rateA < rateB ? a : b;
        const shortDex = rateA < rateB ? b : a;
        const spread = row.rates[shortDex]! - row.rates[longDex]!;
        if (spread <= 0) continue;

        results.push({
          symbol: row.symbol,
          longDex,
          longRate: row.rates[longDex]!,
          shortDex,
          shortRate: row.rates[shortDex]!,
          spread,
          dexCount: row.dexCount,
        });
      } else if (selectedDexes.length === 1) {
        // 1 selected: compare that exchange vs all others
        const picked = selectedDexes[0];
        const pickedRate = row.rates[picked];
        if (pickedRate === undefined) continue;

        const others = ALL_DEXES.filter((d) => d !== picked && row.rates[d] !== undefined);
        if (others.length === 0) continue;

        // Find the best counterparty
        let bestOther = others[0];
        let bestSpread = 0;
        for (const o of others) {
          const spread = Math.abs(row.rates[o]! - pickedRate);
          if (spread > bestSpread) {
            bestSpread = spread;
            bestOther = o;
          }
        }

        const otherRate = row.rates[bestOther]!;
        const longDex = pickedRate < otherRate ? picked : bestOther;
        const shortDex = pickedRate < otherRate ? bestOther : picked;
        const spread = row.rates[shortDex]! - row.rates[longDex]!;
        if (spread <= 0) continue;

        results.push({
          symbol: row.symbol,
          longDex,
          longRate: row.rates[longDex]!,
          shortDex,
          shortRate: row.rates[shortDex]!,
          spread,
          dexCount: row.dexCount,
        });
      } else {
        // None selected: compare all
        const available = ALL_DEXES.filter((d) => row.rates[d] !== undefined);
        if (available.length < 2) continue;

        let bestLongDex = available[0];
        let bestShortDex = available[0];
        for (const d of available) {
          if (row.rates[d]! < row.rates[bestLongDex]!) bestLongDex = d;
          if (row.rates[d]! > row.rates[bestShortDex]!) bestShortDex = d;
        }

        if (bestLongDex === bestShortDex) continue;
        const spread = row.rates[bestShortDex]! - row.rates[bestLongDex]!;
        if (spread <= 0) continue;

        results.push({
          symbol: row.symbol,
          longDex: bestLongDex,
          longRate: row.rates[bestLongDex]!,
          shortDex: bestShortDex,
          shortRate: row.rates[bestShortDex]!,
          spread,
          dexCount: row.dexCount,
        });
      }
    }

    results.sort((a, b) => b.spread - a.spread);
    return results.slice(0, 15);
  }, [rows, selectedDexes, assetFilter]);

  const capitalNum = parseFloat(capital) || 0;
  const leverageNum = parseFloat(leverage) || 1;
  const positionSize = capitalNum * leverageNum;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <h2 className="text-sm font-semibold text-zinc-200 mb-3">
        Top Funding Rate Arbitrage Opportunities
      </h2>

      {/* Exchange filter */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className="text-[10px] text-zinc-500 mr-1">
          {selectedDexes.length === 0 ? 'All vs All' : selectedDexes.length === 1 ? `${DEX_LABELS[selectedDexes[0]]} vs All` : `${DEX_LABELS[selectedDexes[0]]} vs ${DEX_LABELS[selectedDexes[1]]}`}:
        </span>
        {ALL_DEXES.map((d) => (
          <button
            key={d}
            onClick={() => toggleDex(d)}
            className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
              selectedDexes.includes(d)
                ? 'border-zinc-500 bg-zinc-700 text-zinc-100'
                : 'border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
            }`}
          >
            {DEX_LABELS[d]}
          </button>
        ))}
        {selectedDexes.length > 0 && (
          <button
            onClick={() => setSelectedDexes([])}
            className="px-2 py-0.5 rounded text-[10px] text-zinc-600 hover:text-zinc-400"
          >
            Clear
          </button>
        )}
      </div>

      {/* Asset type filter */}
      <div className="flex items-center gap-1.5 mb-3">
        {([
          { label: 'All', value: 'all' as const },
          { label: 'Crypto', value: 'crypto' as const },
          { label: 'RWA', value: 'rwa' as const },
        ]).map((opt) => (
          <button
            key={opt.value}
            onClick={() => setAssetFilter(opt.value)}
            className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
              assetFilter === opt.value
                ? 'border-zinc-500 bg-zinc-700 text-zinc-100'
                : 'border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
        <span className="text-[10px] text-zinc-600 ml-1">
          {assetFilter === 'rwa' ? 'Stocks, Forex, Commodities' : ''}
        </span>
      </div>

      {/* Calculator */}
      <div className="flex items-center gap-3 mb-3 p-2.5 bg-zinc-800/50 rounded-lg border border-zinc-800">
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] text-zinc-500">Capital</label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">$</span>
            <input
              type="number"
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 pl-4 py-1 text-xs text-zinc-200 w-24 focus:outline-none focus:border-zinc-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] text-zinc-500">Leverage</label>
          <div className="relative">
            <input
              type="number"
              value={leverage}
              onChange={(e) => setLeverage(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 w-16 focus:outline-none focus:border-zinc-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">x</span>
          </div>
        </div>
        <div className="text-[10px] text-zinc-500 ml-1">
          Position: <span className="text-zinc-300 font-mono">{fmtMoney(positionSize)}</span>
        </div>
      </div>

      {/* Arb table */}
      {arbRows.length === 0 ? (
        <p className="text-xs text-zinc-600 text-center py-4">No arb opportunities found</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {arbRows.map((row) => {
            const hourlyEarning = row.spread * positionSize;
            const dailyEarning = hourlyEarning * 24;

            return (
              <div
                key={row.symbol}
                className="bg-zinc-800/50 rounded-lg px-3 py-2"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-100">
                      {row.symbol}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {row.dexCount} DEXes
                    </span>
                  </div>
                  <div className="text-amber-400 font-medium text-[11px]">
                    {fmtAnnual(row.spread)} APR
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[11px]">
                  <div>
                    <div className="text-red-400">
                      Long{' '}
                      <span className={DEX_COLORS[row.longDex]}>
                        {DEX_LABELS[row.longDex]}
                      </span>
                    </div>
                    <div className="text-zinc-500 font-mono">{fmtRate(row.longRate)}/h</div>
                  </div>
                  <div>
                    <div className="text-green-400">
                      Short{' '}
                      <span className={DEX_COLORS[row.shortDex]}>
                        {DEX_LABELS[row.shortDex]}
                      </span>
                    </div>
                    <div className="text-zinc-500 font-mono">{fmtRate(row.shortRate)}/h</div>
                  </div>
                  {positionSize > 0 && (
                    <div className="ml-auto text-right border-l border-zinc-700 pl-3">
                      <div className="text-emerald-400 font-mono text-[10px]">
                        {fmtMoney(hourlyEarning)}/h
                      </div>
                      <div className="text-emerald-400/70 font-mono text-[10px]">
                        {fmtMoney(dailyEarning)}/d
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
