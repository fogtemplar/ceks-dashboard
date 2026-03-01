'use client';

import { useState } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useOIHistory } from '@/hooks/use-oi-history';
import { formatUsd, formatPrice } from '@/lib/format';
import { Spinner } from '@/components/ui/Spinner';

interface PriceOIChartProps {
  symbol: string;
}

const periods = [
  { label: '1H', value: '1h' },
  { label: '4H', value: '4h' },
  { label: '1D', value: '1d' },
];

export function PriceOIChart({ symbol }: PriceOIChartProps) {
  const [period, setPeriod] = useState('1h');
  const { data, isLoading } = useOIHistory(symbol, period);

  const chartData = data
    .filter((p) => p.price !== null || p.total > 0)
    .map((p) => ({
      time: new Date(p.timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      Price: p.price,
      'Total OI': p.total > 0 ? p.total : null,
    }));

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-zinc-300">
          {symbol} Price + OI
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
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: '#71717a' }}
              tickLine={false}
              axisLine={{ stroke: '#3f3f46' }}
            />
            {/* Left Y-axis: Price */}
            <YAxis
              yAxisId="price"
              orientation="left"
              tick={{ fontSize: 11, fill: '#a78bfa' }}
              tickFormatter={(v) => formatPrice(v)}
              tickLine={false}
              axisLine={{ stroke: '#7c3aed' }}
              width={80}
            />
            {/* Right Y-axis: OI */}
            <YAxis
              yAxisId="oi"
              orientation="right"
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
              formatter={(value, name) => {
                const v = Number(value ?? 0);
                if (name === 'Price') return [formatPrice(v), 'Price'];
                return [formatUsd(v), name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar
              yAxisId="oi"
              dataKey="Total OI"
              fill="#3b82f6"
              opacity={0.3}
              name="Total OI"
            />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="Price"
              stroke="#a78bfa"
              strokeWidth={2}
              dot={false}
              name="Price"
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
