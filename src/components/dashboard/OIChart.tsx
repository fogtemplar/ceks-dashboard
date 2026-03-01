'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useOIHistory } from '@/hooks/use-oi-history';
import { formatUsd } from '@/lib/format';
import { Spinner } from '@/components/ui/Spinner';

interface OIChartProps {
  symbol: string;
}

const periods = [
  { label: '1H', value: '1h' },
  { label: '4H', value: '4h' },
  { label: '1D', value: '1d' },
];

export function OIChart({ symbol }: OIChartProps) {
  const [period, setPeriod] = useState('1h');
  const { data, isLoading } = useOIHistory(symbol, period);

  const chartData = data.map((p) => ({
    time: new Date(p.timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    Binance: p.binance,
    Bybit: p.bybit,
    Total: p.total,
  }));

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-zinc-300">
          {symbol} Open Interest History
        </h3>
        <div className="flex gap-1">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                period === p.value
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner />
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">
          No historical data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: '#71717a' }}
              tickLine={false}
              axisLine={{ stroke: '#3f3f46' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#71717a' }}
              tickFormatter={(v) => formatUsd(v)}
              tickLine={false}
              axisLine={{ stroke: '#3f3f46' }}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#18181b',
                border: '1px solid #3f3f46',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#a1a1aa' }}
              formatter={(value) => [formatUsd(Number(value ?? 0)), '']}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
            />
            <Line
              type="monotone"
              dataKey="Total"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="Total"
            />
            <Line
              type="monotone"
              dataKey="Binance"
              stroke="#f0b90b"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="4 2"
              name="Binance"
            />
            <Line
              type="monotone"
              dataKey="Bybit"
              stroke="#f97316"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="4 2"
              name="Bybit"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
