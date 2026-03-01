'use client';

import type { AggregatedCoinOI } from '@/types';
import { formatUsd, formatNumber } from '@/lib/format';
import { getIndexTier, getIndexColor } from '@/lib/oi-mc-index';

interface StatsCardsProps {
  data: AggregatedCoinOI[];
}

export function StatsCards({ data }: StatsCardsProps) {
  const totalOI = data.reduce((sum, c) => sum + c.totalOI, 0);

  const withMc = data.filter((c) => c.marketCap > 0);
  const avgIndex =
    withMc.length > 0
      ? withMc.reduce((sum, c) => sum + c.oiMcIndex, 0) / withMc.length
      : 0;
  const avgTier = getIndexTier(avgIndex);

  const sorted = [...withMc].sort((a, b) => b.oiMcIndex - a.oiMcIndex);
  const topLeveraged = sorted[0];
  const leastLeveraged = sorted[sorted.length - 1];
  const topTier = topLeveraged ? getIndexTier(topLeveraged.oiMcIndex) : null;
  const lowTier = leastLeveraged ? getIndexTier(leastLeveraged.oiMcIndex) : null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total OI */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-500 mb-1">Total Open Interest</p>
        <p className="text-xl font-bold text-blue-400">{formatUsd(totalOI)}</p>
        <p className="text-xs text-zinc-500 mt-1">{data.length} coins tracked</p>
      </div>

      {/* Avg Index */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-500 mb-1">Avg OI/MC Index</p>
        <div className="flex items-baseline gap-2">
          <span
            className="text-xl font-bold"
            style={{ color: getIndexColor(avgIndex) }}
          >
            {formatNumber(avgIndex)}
          </span>
          <span
            className="text-sm font-semibold"
            style={{ color: getIndexColor(avgIndex) }}
          >
            {avgTier.grade}
          </span>
        </div>
        <p className="text-xs text-zinc-500 mt-1">{avgTier.label}</p>
      </div>

      {/* Most Leveraged */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-500 mb-1">Most Leveraged</p>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-red-400">
            {topLeveraged?.symbol ?? '-'}
          </span>
          {topTier && (
            <span
              className="text-sm font-semibold"
              style={{ color: getIndexColor(topLeveraged!.oiMcIndex) }}
            >
              {topTier.grade}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          {topLeveraged
            ? `${topLeveraged.oiMcIndex.toFixed(1)} | OI/MC ${(topLeveraged.oiMcRatio * 100).toFixed(2)}%`
            : ''}
        </p>
      </div>

      {/* Least Leveraged */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-500 mb-1">Least Leveraged</p>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-green-400">
            {leastLeveraged?.symbol ?? '-'}
          </span>
          {lowTier && (
            <span
              className="text-sm font-semibold"
              style={{ color: getIndexColor(leastLeveraged!.oiMcIndex) }}
            >
              {lowTier.grade}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          {leastLeveraged
            ? `${leastLeveraged.oiMcIndex.toFixed(1)} | OI/MC ${(leastLeveraged.oiMcRatio * 100).toFixed(2)}%`
            : ''}
        </p>
      </div>
    </div>
  );
}
