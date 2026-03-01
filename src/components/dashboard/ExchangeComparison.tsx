'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { AggregatedCoinOI } from '@/types';
import { formatUsd } from '@/lib/format';

interface ExchangeComparisonProps {
  data: AggregatedCoinOI[];
}

export function ExchangeComparison({ data }: ExchangeComparisonProps) {
  // Top 15 by total OI
  const top = [...data]
    .sort((a, b) => b.totalOI - a.totalOI)
    .slice(0, 15)
    .map((c) => ({
      symbol: c.symbol,
      Binance: c.oiByExchange.binance ?? 0,
      Bybit: c.oiByExchange.bybit ?? 0,
      OKX: c.oiByExchange.okx ?? 0,
      Bitget: c.oiByExchange.bitget ?? 0,
    }));

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <h3 className="text-sm font-medium text-zinc-300 mb-4">
        Exchange OI Comparison (Top 15)
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={top} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#71717a' }}
            tickFormatter={(v) => formatUsd(v)}
            axisLine={{ stroke: '#3f3f46' }}
          />
          <YAxis
            type="category"
            dataKey="symbol"
            tick={{ fontSize: 12, fill: '#a1a1aa', fontWeight: 500 }}
            width={60}
            axisLine={{ stroke: '#3f3f46' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value) => [formatUsd(Number(value ?? 0)), '']}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar
            dataKey="Binance"
            stackId="oi"
            fill="#f0b90b"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="Bybit"
            stackId="oi"
            fill="#f97316"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="OKX"
            stackId="oi"
            fill="#71717a"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="Bitget"
            stackId="oi"
            fill="#06b6d4"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
