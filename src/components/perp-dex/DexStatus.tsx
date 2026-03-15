'use client';

import { useState, useEffect } from 'react';
import type { DexFundingData } from '@/types/perp-dex';

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'now';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function DexStatus({ dexes }: { dexes: DexFundingData[] }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-wrap gap-2">
      {dexes.map((d) => {
        const countdown =
          d.nextFundingTime && d.nextFundingTime > now
            ? d.nextFundingTime - now
            : null;

        return (
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
              {d.error ? 'error' : `${d.rates.length}`}
            </span>
            {countdown !== null && (
              <span className="text-amber-400/80 font-mono text-[10px]">
                {formatCountdown(countdown)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
