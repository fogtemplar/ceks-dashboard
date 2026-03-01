'use client';

import type { AggregatedCoinOI } from '@/types';
import { formatPercent, formatUsd } from '@/lib/format';

interface OIMoversProps {
  data: AggregatedCoinOI[];
}

export function OIMovers({ data }: OIMoversProps) {
  const withChange = data.filter((c) => c.oiChange24h !== null && c.marketCap > 0);

  if (withChange.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-500 text-center">
          OI change data will appear after ~1 hour of tracking
        </p>
      </div>
    );
  }

  const sorted = [...withChange].sort((a, b) => (b.oiChange24h ?? 0) - (a.oiChange24h ?? 0));
  const surging = sorted.slice(0, 5);
  const dropping = sorted.slice(-5).reverse();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* OI Surge */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-xs font-medium text-zinc-400 uppercase mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          24h OI Surge Top 5
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
              <span className="text-sm font-bold text-green-400">
                {formatPercent(coin.oiChange24h)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* OI Drop */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-xs font-medium text-zinc-400 uppercase mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          24h OI Drop Top 5
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
              <span className="text-sm font-bold text-red-400">
                {formatPercent(coin.oiChange24h)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
