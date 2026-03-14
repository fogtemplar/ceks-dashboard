'use client';

import { usePerpDex } from '@/hooks/use-perp-dex';
import { Spinner } from '@/components/ui/Spinner';
import { FundingTable } from './FundingTable';
import { ArbOpportunities } from './ArbOpportunities';
import { DexStatus } from './DexStatus';
import { timeAgo } from '@/lib/format';

export function PerpDexDashboard() {
  const { data, error, isLoading, isValidating, refresh } = usePerpDex();

  if (isLoading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Spinner size="lg" />
        <p className="text-zinc-500 text-sm">
          Loading funding rates from DEXes...
        </p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-red-400 text-lg">Failed to load data</div>
        <p className="text-zinc-500 text-sm">{error.message}</p>
        <button
          onClick={() => refresh()}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          Funding rate comparison across Perp DEXes
        </p>
        <div className="flex items-center gap-3">
          {data.updatedAt && (
            <span className="text-xs text-zinc-500">
              {timeAgo(data.updatedAt)}
            </span>
          )}
          {isValidating && <Spinner size="sm" />}
          <button
            onClick={() => refresh()}
            disabled={isValidating}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-lg text-xs text-zinc-300 transition-colors border border-zinc-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* DEX Status */}
      <DexStatus dexes={data.dexes} />

      {/* Top Arb Opportunities */}
      <ArbOpportunities rows={data.aggregated} />

      {/* Full Funding Rate Table */}
      <FundingTable rows={data.aggregated} dexes={data.dexes} />
    </div>
  );
}
