'use client';

import { useState } from 'react';
import type { AggregatedCoinOI } from '@/types';
import { formatPercent, formatUsd } from '@/lib/format';

interface OIMoversProps {
  data: AggregatedCoinOI[];
}

type TimeFrame = '1h' | '24h';

function getChange(coin: AggregatedCoinOI, tf: TimeFrame): number | null {
  return tf === '1h' ? coin.oiChange1h : coin.oiChange24h;
}

export function OIMovers({ data }: OIMoversProps) {
  const [tf, setTf] = useState<TimeFrame>('24h');

  const withChange = data.filter((c) => getChange(c, tf) !== null && c.marketCap > 0);
  const hasRealData = withChange.length > 0;

  let surging: AggregatedCoinOI[];
  let dropping: AggregatedCoinOI[];

  if (hasRealData) {
    const sorted = [...withChange].sort((a, b) => (getChange(b, tf) ?? 0) - (getChange(a, tf) ?? 0));
    surging = sorted.slice(0, 5);
    dropping = sorted.slice(-5).reverse();
  } else {
    const withMc = data.filter((c) => c.marketCap > 0);
    const byRatio = [...withMc].sort((a, b) => b.oiMcRatio - a.oiMcRatio);
    surging = byRatio.slice(0, 5);
    dropping = byRatio.slice(-5).reverse();
  }

  const tfLabel = tf === '1h' ? '1H' : '24H';

  return (
    <div>
      {/* Time frame toggle */}
      <div className="flex items-center gap-2 mb-3">
        {(['1h', '24h'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTf(t)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              tf === t
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t === '1h' ? '1H' : '24H'}
          </button>
        ))}
        {!hasRealData && (
          <span className="text-[10px] text-zinc-600 ml-1">OI/MC ratio shown until change data accumulates</span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Surge */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-xs font-medium text-zinc-400 uppercase mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            {hasRealData ? `${tfLabel} OI Surge Top 5` : 'Highest OI/MC Ratio Top 5'}
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
                  {hasRealData ? formatPercent(getChange(coin, tf)) : `${(coin.oiMcRatio * 100).toFixed(2)}%`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Drop */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-xs font-medium text-zinc-400 uppercase mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            {hasRealData ? `${tfLabel} OI Drop Top 5` : 'Lowest OI/MC Ratio Top 5'}
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
                  {hasRealData ? formatPercent(getChange(coin, tf)) : `${(coin.oiMcRatio * 100).toFixed(2)}%`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
