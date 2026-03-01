'use client';

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  exchanges: { binance: boolean; bybit: boolean; okx: boolean; bitget: boolean };
  onExchangeToggle: (exchange: 'binance' | 'bybit' | 'okx' | 'bitget') => void;
  mcOnly: boolean;
  onMcOnlyToggle: () => void;
}

export function FilterBar({
  search,
  onSearchChange,
  exchanges,
  onExchangeToggle,
  mcOnly,
  onMcOnlyToggle,
}: FilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <input
        type="text"
        placeholder="Search coin..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 w-full sm:w-64"
      />
      <div className="flex gap-2">
        {(['binance', 'bybit', 'okx', 'bitget'] as const).map((ex) => (
          <button
            key={ex}
            onClick={() => onExchangeToggle(ex)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              exchanges[ex]
                ? ex === 'binance'
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : ex === 'bybit'
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : ex === 'bitget'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-zinc-500/20 text-zinc-300 border border-zinc-500/30'
                : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
            }`}
          >
            {ex.charAt(0).toUpperCase() + ex.slice(1)}
          </button>
        ))}
        <button
          onClick={onMcOnlyToggle}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            mcOnly
              ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
              : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
          }`}
        >
          MC Only
        </button>
      </div>
    </div>
  );
}
