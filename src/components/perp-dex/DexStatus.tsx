'use client';

import type { DexFundingData } from '@/types/perp-dex';

export function DexStatus({ dexes }: { dexes: DexFundingData[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {dexes.map((d) => (
        <div
          key={d.dex}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border ${
            d.error
              ? 'border-red-800/50 bg-red-950/30 text-red-400'
              : 'border-zinc-800 bg-zinc-900 text-zinc-300'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              d.error ? 'bg-red-500' : 'bg-emerald-500'
            }`}
          />
          <span className="font-medium">{d.label}</span>
          <span className="text-zinc-600">
            {d.error ? 'error' : `${d.rates.length} pairs`}
          </span>
        </div>
      ))}
    </div>
  );
}
