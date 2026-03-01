'use client';

import type { AggregatedCoinOI } from '@/types';
import { formatPercent, formatUsd } from '@/lib/format';

interface OIMoversProps {
  data: AggregatedCoinOI[];
}

export function OIMovers({ data }: OIMoversProps) {
  const withChange = data.filter((c) => c.oiChange24h !== null && c.marketCap > 0);
  const hasRealData = withChange.length > 0;

  // Real data available: sort by 24h change
  // No real data: preview mode - sort by OI/MC ratio as proxy
  let surging: AggregatedCoinOI[];
  let dropping: AggregatedCoinOI[];

  if (hasRealData) {
    const sorted = [...withChange].sort((a, b) => (b.oiChange24h ?? 0) - (a.oiChange24h ?? 0));
    surging = sorted.slice(0, 5);
    dropping = sorted.slice(-5).reverse();
  } else {
    const withMc = data.filter((c) => c.marketCap > 0);
    const byRatio = [...withMc].sort((a, b) => b.oiMcRatio - a.oiMcRatio);
    surging = byRatio.slice(0, 5);
    dropping = byRatio.slice(-5).reverse();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* OI Surge / High OI/MC */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-xs font-medium text-zinc-400 uppercase mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          {hasRealData ? '24h OI Surge Top 5' : 'Highest OI/MC Ratio Top 5'}
          {!hasRealData && (
            <span className="text-[10px] text-zinc-600 normal-case ml-1">(24h data after ~1hr)</span>
          )}
        </h3>
        <div className="space-y-2">
          {surging.map((coin, i) => (
            <div key={coin.symbol} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 w-4">{i + 1}</span>
                {coin.image && (
                  <img src={coin.image} alt={coin.symbol} className="w-5 h-5 rounded-full" />
                )}
                <span className="text-sm font-medium text-zinc-200">{coin.symbol}</span>
                <span className="text-xs text-zinc-500">{formatUsd(coin.totalOI)}</span>
              </div>
              <span className={`text-sm font-bold ${hasRealData ? 'text-green-400' : 'text-zinc-300'}`}>
                {hasRealData ? formatPercent(coin.oiChange24h) : `${(coin.oiMcRatio * 100).toFixed(2)}%`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* OI Drop / Low OI/MC */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-xs font-medium text-zinc-400 uppercase mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          {hasRealData ? '24h OI Drop Top 5' : 'Lowest OI/MC Ratio Top 5'}
          {!hasRealData && (
            <span className="text-[10px] text-zinc-600 normal-case ml-1">(24h data after ~1hr)</span>
          )}
        </h3>
        <div className="space-y-2">
          {dropping.map((coin, i) => (
            <div key={coin.symbol} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 w-4">{i + 1}</span>
                {coin.image && (
                  <img src={coin.image} alt={coin.symbol} className="w-5 h-5 rounded-full" />
                )}
                <span className="text-sm font-medium text-zinc-200">{coin.symbol}</span>
                <span className="text-xs text-zinc-500">{formatUsd(coin.totalOI)}</span>
              </div>
              <span className={`text-sm font-bold ${hasRealData ? 'text-red-400' : 'text-zinc-300'}`}>
                {hasRealData ? formatPercent(coin.oiChange24h) : `${(coin.oiMcRatio * 100).toFixed(2)}%`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
