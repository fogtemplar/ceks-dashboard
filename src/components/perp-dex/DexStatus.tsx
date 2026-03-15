'use client';

import { useState, useEffect } from 'react';
import type { DexFundingData, DexName } from '@/types/perp-dex';
import { DEX_LOGOS } from '@/lib/perp-dex/logos';

const CEX_NAMES: Set<DexName> = new Set(['binance', 'okx', 'bybit', 'bitget', 'gate']);

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

function DexBadge({ d, now }: { d: DexFundingData; now: number }) {
  const countdown =
    d.nextFundingTime && d.nextFundingTime > now
      ? d.nextFundingTime - now
      : null;

  return (
    <div
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={DEX_LOGOS[d.dex]} alt={d.label} className="w-3.5 h-3.5 rounded-sm" />
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
}

export function DexStatus({ dexes }: { dexes: DexFundingData[] }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const cexList = dexes.filter((d) => CEX_NAMES.has(d.dex));
  const dexList = dexes.filter((d) => !CEX_NAMES.has(d.dex));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-zinc-500 font-medium w-8">CEX</span>
        {cexList.map((d) => (
          <DexBadge key={d.dex} d={d} now={now} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-zinc-500 font-medium w-8">DEX</span>
        {dexList.map((d) => (
          <DexBadge key={d.dex} d={d} now={now} />
        ))}
      </div>
    </div>
  );
}
