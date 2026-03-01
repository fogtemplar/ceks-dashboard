'use client';

import type { SortField, SortDirection } from '@/types';

interface SortHeaderProps {
  label: string;
  field: SortField;
  currentSort: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  align?: 'left' | 'right';
}

export function SortHeader({
  label,
  field,
  currentSort,
  direction,
  onSort,
  align = 'right',
}: SortHeaderProps) {
  const isActive = currentSort === field;

  return (
    <th
      onClick={() => onSort(field)}
      className={`px-3 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-200 select-none whitespace-nowrap ${
        align === 'left' ? 'text-left' : 'text-right'
      }`}
    >
      <span className="inline-flex items-center gap-1">
        {align === 'right' && isActive && (
          <span className="text-zinc-200">{direction === 'asc' ? '\u25B2' : '\u25BC'}</span>
        )}
        {label}
        {align === 'left' && isActive && (
          <span className="text-zinc-200">{direction === 'asc' ? '\u25B2' : '\u25BC'}</span>
        )}
      </span>
    </th>
  );
}
