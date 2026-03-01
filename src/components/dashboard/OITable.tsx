'use client';

import { useState, useMemo } from 'react';
import type { AggregatedCoinOI, SortField, SortDirection } from '@/types';
import { formatUsd, formatPrice, formatPercent } from '@/lib/format';
import { getIndexColor, getIndexTier, getIndexBgColor } from '@/lib/oi-mc-index';
import { SortHeader } from '@/components/ui/SortHeader';
import { FilterBar } from '@/components/ui/FilterBar';

interface OITableProps {
  data: AggregatedCoinOI[];
  onSelectCoin: (symbol: string) => void;
  selectedCoin: string | null;
}

function ChangeCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-zinc-600">-</span>;
  const color = value > 0 ? 'text-green-400' : value < 0 ? 'text-red-400' : 'text-zinc-400';
  return <span className={`${color} text-xs font-medium`}>{formatPercent(value)}</span>;
}

export function OITable({ data, onSelectCoin, selectedCoin }: OITableProps) {
  const [sortField, setSortField] = useState<SortField>('oiMcRatio');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [search, setSearch] = useState('');
  const [exchanges, setExchanges] = useState({
    binance: true,
    bybit: true,
    okx: true,
    bitget: true,
  });
  const [mcOnly, setMcOnly] = useState(true);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const handleExchangeToggle = (ex: 'binance' | 'bybit' | 'okx' | 'bitget') => {
    setExchanges((prev) => ({ ...prev, [ex]: !prev[ex] }));
  };

  const allExchangesOn = exchanges.binance && exchanges.bybit && exchanges.okx && exchanges.bitget;

  const filtered = useMemo(() => {
    let result = data;

    if (mcOnly) {
      result = result.filter((c) => c.marketCap > 0);
    }

    // Filter by exchange: only show coins that have OI on at least one enabled exchange
    // Recalculate totalOI based on enabled exchanges
    if (!allExchangesOn) {
      result = result.map((c) => {
        const filteredTotal =
          (exchanges.binance ? c.oiByExchange.binance ?? 0 : 0) +
          (exchanges.bybit ? c.oiByExchange.bybit ?? 0 : 0) +
          (exchanges.okx ? c.oiByExchange.okx ?? 0 : 0) +
          (exchanges.bitget ? c.oiByExchange.bitget ?? 0 : 0);
        if (filteredTotal <= 0) return null;
        return { ...c, totalOI: filteredTotal };
      }).filter((c): c is AggregatedCoinOI => c !== null);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.symbol.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortField) {
        case 'symbol':
          return sortDir === 'asc'
            ? a.symbol.localeCompare(b.symbol)
            : b.symbol.localeCompare(a.symbol);
        case 'price':
          aVal = a.price;
          bVal = b.price;
          break;
        case 'marketCap':
          aVal = a.marketCap;
          bVal = b.marketCap;
          break;
        case 'totalOI':
          aVal = a.totalOI;
          bVal = b.totalOI;
          break;
        case 'oiChange1h':
          aVal = a.oiChange1h ?? 0;
          bVal = b.oiChange1h ?? 0;
          break;
        case 'oiChange6h':
          aVal = a.oiChange6h ?? 0;
          bVal = b.oiChange6h ?? 0;
          break;
        case 'oiChange24h':
          aVal = a.oiChange24h ?? 0;
          bVal = b.oiChange24h ?? 0;
          break;
        case 'oiMcIndex':
          aVal = a.oiMcIndex;
          bVal = b.oiMcIndex;
          break;
        case 'oiMcRatio':
          aVal = a.oiMcRatio;
          bVal = b.oiMcRatio;
          break;
        default:
          aVal = a.totalOI;
          bVal = b.totalOI;
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [data, search, sortField, sortDir, mcOnly, allExchangesOn, exchanges.binance, exchanges.bybit, exchanges.okx, exchanges.bitget]);

  return (
    <div>
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        exchanges={exchanges}
        onExchangeToggle={handleExchangeToggle}
        mcOnly={mcOnly}
        onMcOnlyToggle={() => setMcOnly((v) => !v)}
      />

      {selectedCoin && (
        <div className="mt-3 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center gap-2">
          <span className="text-xs text-blue-400">Selected:</span>
          <span className="text-sm font-medium text-blue-300">{selectedCoin}</span>
          <button
            onClick={() => onSelectCoin('')}
            className="ml-auto text-xs text-zinc-500 hover:text-zinc-300"
          >
            Clear
          </button>
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[1100px]">
          <thead className="bg-zinc-900/80">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-zinc-400 uppercase w-10">
                #
              </th>
              <SortHeader
                label="Coin"
                field="symbol"
                currentSort={sortField}
                direction={sortDir}
                onSort={handleSort}
                align="left"
              />
              <SortHeader
                label="Price"
                field="price"
                currentSort={sortField}
                direction={sortDir}
                onSort={handleSort}
              />
              <th className="px-3 py-3 text-right text-xs font-medium text-zinc-500 uppercase whitespace-nowrap">
                P 1h
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-zinc-500 uppercase whitespace-nowrap">
                P 6h
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-zinc-500 uppercase whitespace-nowrap">
                P 24h
              </th>
              <SortHeader
                label="OI/MC"
                field="oiMcRatio"
                currentSort={sortField}
                direction={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label="Grade"
                field="oiMcIndex"
                currentSort={sortField}
                direction={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label="Market Cap"
                field="marketCap"
                currentSort={sortField}
                direction={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label="Total OI"
                field="totalOI"
                currentSort={sortField}
                direction={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label="1h"
                field="oiChange1h"
                currentSort={sortField}
                direction={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label="6h"
                field="oiChange6h"
                currentSort={sortField}
                direction={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label="24h"
                field="oiChange24h"
                currentSort={sortField}
                direction={sortDir}
                onSort={handleSort}
              />
              {exchanges.binance && (
                <th className="px-3 py-3 text-right text-xs font-medium text-yellow-500/70 uppercase whitespace-nowrap">
                  Binance
                </th>
              )}
              {exchanges.bybit && (
                <th className="px-3 py-3 text-right text-xs font-medium text-orange-500/70 uppercase whitespace-nowrap">
                  Bybit
                </th>
              )}
              {exchanges.okx && (
                <th className="px-3 py-3 text-right text-xs font-medium text-zinc-400 uppercase whitespace-nowrap">
                  OKX
                </th>
              )}
              {exchanges.bitget && (
                <th className="px-3 py-3 text-right text-xs font-medium text-cyan-500/70 uppercase whitespace-nowrap">
                  Bitget
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {filtered.map((coin, idx) => (
              <tr
                key={coin.symbol}
                onClick={() => onSelectCoin(coin.symbol)}
                className={`hover:bg-zinc-800/50 cursor-pointer transition-colors ${
                  selectedCoin === coin.symbol ? 'bg-blue-500/10 border-l-2 border-l-blue-500' : ''
                }`}
              >
                <td className="px-3 py-3 text-sm text-zinc-500">{idx + 1}</td>
                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCoin(coin.symbol);
                    }}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left"
                  >
                    {coin.image && (
                      <img
                        src={coin.image}
                        alt={coin.symbol}
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <div>
                      <span className="text-sm font-medium text-blue-400 hover:text-blue-300 underline decoration-blue-400/30">
                        {coin.symbol}
                      </span>
                      <span className="text-xs text-zinc-500 ml-2 hidden sm:inline">
                        {coin.name}
                      </span>
                    </div>
                  </button>
                </td>
                <td className="px-3 py-3 text-right text-sm text-zinc-300">
                  {coin.price > 0 ? formatPrice(coin.price) : '-'}
                </td>
                <td className={`px-3 py-3 text-right text-sm ${coin.priceChange1h !== null ? (coin.priceChange1h >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-zinc-500'}`}>
                  {formatPercent(coin.priceChange1h)}
                </td>
                <td className={`px-3 py-3 text-right text-sm ${coin.priceChange6h !== null ? (coin.priceChange6h >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-zinc-500'}`}>
                  {formatPercent(coin.priceChange6h)}
                </td>
                <td className={`px-3 py-3 text-right text-sm ${coin.priceChange24h !== null ? (coin.priceChange24h >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-zinc-500'}`}>
                  {formatPercent(coin.priceChange24h)}
                </td>
                <td className="px-3 py-3 text-right text-sm text-zinc-300">
                  {coin.marketCap > 0 ? `${(coin.oiMcRatio * 100).toFixed(2)}%` : '-'}
                </td>
                <td className="px-3 py-3 text-right">
                  {coin.marketCap > 0 ? (() => {
                    const tier = getIndexTier(coin.oiMcIndex);
                    return (
                      <div className="flex items-center justify-end gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${getIndexBgColor(coin.oiMcIndex)}`}
                          style={{ color: getIndexColor(coin.oiMcIndex) }}
                        >
                          {tier.grade}
                        </span>
                        <div className="flex flex-col items-end">
                          <div className="w-12 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, coin.oiMcIndex)}%`,
                                backgroundColor: getIndexColor(coin.oiMcIndex),
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-zinc-500 mt-0.5">
                            {coin.oiMcIndex.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    );
                  })() : (
                    <span className="text-sm text-zinc-600">-</span>
                  )}
                </td>
                <td className="px-3 py-3 text-right text-sm text-zinc-300">
                  {coin.marketCap > 0 ? formatUsd(coin.marketCap) : '-'}
                </td>
                <td className="px-3 py-3 text-right text-sm font-medium text-zinc-200">
                  {formatUsd(coin.totalOI)}
                </td>
                <td className="px-3 py-3 text-right">
                  <ChangeCell value={coin.oiChange1h} />
                </td>
                <td className="px-3 py-3 text-right">
                  <ChangeCell value={coin.oiChange6h} />
                </td>
                <td className="px-3 py-3 text-right">
                  <ChangeCell value={coin.oiChange24h} />
                </td>
                {exchanges.binance && (
                  <td className="px-3 py-3 text-right text-sm text-zinc-400">
                    {coin.oiByExchange.binance
                      ? formatUsd(coin.oiByExchange.binance)
                      : '-'}
                  </td>
                )}
                {exchanges.bybit && (
                  <td className="px-3 py-3 text-right text-sm text-zinc-400">
                    {coin.oiByExchange.bybit
                      ? formatUsd(coin.oiByExchange.bybit)
                      : '-'}
                  </td>
                )}
                {exchanges.okx && (
                  <td className="px-3 py-3 text-right text-sm text-zinc-400">
                    {coin.oiByExchange.okx
                      ? formatUsd(coin.oiByExchange.okx)
                      : '-'}
                  </td>
                )}
                {exchanges.bitget && (
                  <td className="px-3 py-3 text-right text-sm text-zinc-400">
                    {coin.oiByExchange.bitget
                      ? formatUsd(coin.oiByExchange.bitget)
                      : '-'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            No coins found
          </div>
        )}
      </div>
    </div>
  );
}
