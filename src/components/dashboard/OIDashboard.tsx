'use client';

import { useState } from 'react';
import { useOIData } from '@/hooks/use-oi-data';
import { StatsCards } from './StatsCards';
import { OITable } from './OITable';
import { OIChart } from './OIChart';
import { PriceOIChart } from './PriceOIChart';
import { ExchangeComparison } from './ExchangeComparison';
import { OIMovers } from './OIMovers';
import { Spinner } from '@/components/ui/Spinner';
import { timeAgo } from '@/lib/format';

export function OIDashboard() {
  const { data, updatedAt, isPartial, error, isLoading, isValidating, refresh } =
    useOIData();
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);

  if (isLoading && data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Spinner size="lg" />
        <p className="text-zinc-500 text-sm">
          Loading OI data from exchanges...
        </p>
        <p className="text-zinc-600 text-xs">
          First load may take 10-20 seconds
        </p>
      </div>
    );
  }

  if (error && data.length === 0) {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            CEK'S Dashboard
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Futures Open Interest across Binance, Bybit, OKX & Bitget
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isPartial && (
            <span className="text-xs text-amber-400/80 bg-amber-400/10 px-2 py-0.5 rounded">
              Loading full data...
            </span>
          )}
          {updatedAt && (
            <span className="text-xs text-zinc-500">
              {timeAgo(updatedAt)}
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

      {/* OI Movers - Surge/Drop Top 5 */}
      <OIMovers data={data} />

      {/* Stats Cards */}
      <StatsCards data={data} />

      {/* Main Table */}
      <OITable
        data={data}
        onSelectCoin={setSelectedCoin}
        selectedCoin={selectedCoin}
      />

      {/* Detail Section */}
      {selectedCoin ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PriceOIChart symbol={selectedCoin} />
          <OIChart symbol={selectedCoin} />
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-center h-[370px]">
          <p className="text-zinc-500 text-sm">
            Click a coin in the table to view charts
          </p>
        </div>
      )}

      {/* Exchange Comparison */}
      <ExchangeComparison data={data} />
    </div>
  );
}
