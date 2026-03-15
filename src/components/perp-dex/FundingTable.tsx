'use client';

import { useState, useMemo } from 'react';
import type {
  AggregatedFundingRow,
  DexFundingData,
  DexName,
} from '@/types/perp-dex';

const DEX_ORDER: DexName[] = [
  'binance',
  'bybit',
  'okx',
  'bitget',
  'gate',
  'hyperliquid',
  'aster',
  'backpack',
  'edgex',
  'lighter',
  'grvt',
  'variational',
  'extended',
];

const DEX_LABELS: Record<DexName, string> = {
  binance: 'Binance',
  bybit: 'Bybit',
  okx: 'OKX',
  bitget: 'Bitget',
  gate: 'Gate',
  hyperliquid: 'HL',
  aster: 'Aster',
  backpack: 'BP',
  edgex: 'EdgeX',
  lighter: 'Lighter',
  grvt: 'GRVT',
  variational: 'Var',
  extended: 'Ext',
};

function rateColor(rate: number): string {
  if (rate > 0.0001) return 'text-green-400';
  if (rate > 0) return 'text-green-400/70';
  if (rate < -0.0001) return 'text-red-400';
  if (rate < 0) return 'text-red-400/70';
  return 'text-zinc-500';
}

function fmtRate(rate: number | undefined): string {
  if (rate === undefined) return '-';
  return `${(rate * 100).toFixed(4)}%`;
}

function fmtInterval(h: number | undefined): string {
  if (h === undefined) return '';
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h}h`;
}

type SortKey = 'symbol' | 'spread' | 'dexCount' | DexName;
type SortDir = 'asc' | 'desc';

export function FundingTable({
  rows,
  dexes,
}: {
  rows: AggregatedFundingRow[];
  dexes: DexFundingData[];
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('spread');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [minDexCount, setMinDexCount] = useState(2);

  const activeDexes = useMemo(
    () => DEX_ORDER.filter((d) => dexes.some((dd) => dd.dex === d && !dd.error)),
    [dexes]
  );

  const filtered = useMemo(() => {
    let result = rows.filter((r) => r.dexCount >= minDexCount);
    if (search) {
      const q = search.toUpperCase();
      result = result.filter((r) => r.symbol.includes(q));
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'symbol') {
        cmp = a.symbol.localeCompare(b.symbol);
      } else if (sortKey === 'spread') {
        cmp = a.spread - b.spread;
      } else if (sortKey === 'dexCount') {
        cmp = a.dexCount - b.dexCount;
      } else {
        const ra = a.rates[sortKey] ?? -Infinity;
        const rb = b.rates[sortKey] ?? -Infinity;
        cmp = ra - rb;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return result;
  }, [rows, search, sortKey, sortDir, minDexCount]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortHeader = ({
    label,
    col,
    className,
  }: {
    label: string;
    col: SortKey;
    className?: string;
  }) => (
    <th
      onClick={() => toggleSort(col)}
      className={`px-2 py-2 text-[10px] font-medium text-zinc-500 cursor-pointer hover:text-zinc-300 select-none ${className ?? ''}`}
    >
      {label}
      {sortKey === col && (
        <span className="ml-0.5">{sortDir === 'desc' ? '↓' : '↑'}</span>
      )}
    </th>
  );

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Controls */}
      <div className="flex items-center gap-3 p-3 border-b border-zinc-800">
        <input
          type="text"
          placeholder="Search symbol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1 text-xs text-zinc-200 placeholder-zinc-600 w-40 focus:outline-none focus:border-zinc-500"
        />
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <span>Min DEXes:</span>
          {[1, 2, 3, 5, 8].map((n) => (
            <button
              key={n}
              onClick={() => setMinDexCount(n)}
              className={`px-1.5 py-0.5 rounded text-[10px] ${
                minDexCount === n
                  ? 'bg-zinc-700 text-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {n}+
            </button>
          ))}
        </div>
        <span className="text-[10px] text-zinc-600 ml-auto">
          {filtered.length} pairs
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800">
              <SortHeader label="Symbol" col="symbol" className="text-left pl-3" />
              {activeDexes.map((d) => (
                <SortHeader
                  key={d}
                  label={DEX_LABELS[d]}
                  col={d}
                  className="text-right"
                />
              ))}
              <SortHeader label="Spread" col="spread" className="text-right" />
              <SortHeader label="#" col="dexCount" className="text-right pr-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 200).map((row) => {
              const rateValues = Object.values(row.rates);
              const minR = Math.min(...rateValues);
              const maxR = Math.max(...rateValues);

              return (
                <tr
                  key={row.symbol}
                  className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
                >
                  <td className="px-2 py-1.5 pl-3 font-medium text-zinc-200">
                    {row.symbol}
                  </td>
                  {activeDexes.map((d) => {
                    const rate = row.rates[d];
                    const interval = row.intervals[d];
                    const isMin = rate !== undefined && rate === minR && rateValues.length > 1;
                    const isMax = rate !== undefined && rate === maxR && rateValues.length > 1;
                    return (
                      <td
                        key={d}
                        className={`px-2 py-1.5 text-right font-mono ${
                          rate !== undefined ? rateColor(rate) : 'text-zinc-700'
                        } ${isMin ? 'bg-red-950/20' : ''} ${isMax ? 'bg-green-950/20' : ''}`}
                      >
                        <span>{fmtRate(rate)}</span>
                        {interval !== undefined && rate !== undefined && (
                          <span className="text-[9px] text-zinc-600 ml-0.5">
                            /{fmtInterval(interval)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-2 py-1.5 text-right font-mono text-amber-400">
                    {row.spread > 0
                      ? `${(row.spread * 100).toFixed(4)}%`
                      : '-'}
                  </td>
                  <td className="px-2 py-1.5 text-right pr-3 text-zinc-500">
                    {row.dexCount}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
