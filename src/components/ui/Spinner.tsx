'use client';

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-8 w-8' : 'h-6 w-6';
  return (
    <div
      className={`${sizeClass} animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-200`}
    />
  );
}
