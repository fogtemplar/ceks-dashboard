'use client';

import type { AggregatedFundingRow, DexName } from '@/types/perp-dex';

const DEX_COLORS: Record<DexName, string> = {
  hyperliquid: 'text-emerald-400',
  aster: 'text-blue-400',
  edgex: 'text-purple-400',
  lighter: 'text-cyan-400',
  grvt: 'text-amber-400',
  variational: 'text-pink-400',
  extended: 'text-orange-400',
};

function fmtRate(rate: number): string {
  return `${(rate * 100).toFixed(4)}%`;
}

function fmtAnnual(hourlyRate: number): string {
  const annual = hourlyRate * 8760 * 100;
  return `${annual >= 0 ? '+' : ''}${annual.toFixed(1)}%`;
}

export function ArbOpportunities({
  rows,
}: {
  rows: AggregatedFundingRow[];
}) {
  // Show top 10 arb opportunities with at least 2 DEXes
  const top = rows.filter((r) => r.dexCount >= 2 && r.spread > 0).slice(0, 10);

  if (top.length === 0) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <h2 className="text-sm font-semibold text-zinc-200 mb-3">
        Top Funding Rate Arbitrage Opportunities
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {top.map((row) => (
          <div
            key={row.symbol}
            className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-100 w-14">
                {row.symbol}
              </span>
              <span className="text-[10px] text-zinc-500">
                {row.dexCount} DEXes
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              {row.bestLong && (
                <div className="text-right">
                  <div className="text-red-400">
                    Long on{' '}
                    <span className={DEX_COLORS[row.bestLong.dex]}>
                      {row.bestLong.dex}
                    </span>
                  </div>
                  <div className="text-zinc-500">{fmtRate(row.bestLong.rate)}/h</div>
                </div>
              )}
              {row.bestShort && (
                <div className="text-right">
                  <div className="text-green-400">
                    Short on{' '}
                    <span className={DEX_COLORS[row.bestShort.dex]}>
                      {row.bestShort.dex}
                    </span>
                  </div>
                  <div className="text-zinc-500">{fmtRate(row.bestShort.rate)}/h</div>
                </div>
              )}
              <div className="text-right pl-2 border-l border-zinc-700">
                <div className="text-amber-400 font-medium">
                  {fmtAnnual(row.spread)} APR
                </div>
                <div className="text-zinc-600 text-[10px]">spread</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
