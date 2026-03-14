'use client';

import useSWR from 'swr';
import type { PerpDexResponse } from '@/types/perp-dex';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function usePerpDex() {
  const { data, error, isLoading, isValidating, mutate } =
    useSWR<PerpDexResponse>('/api/perp-dex', fetcher, {
      refreshInterval: 60_000,
      dedupingInterval: 30_000,
      keepPreviousData: true,
    });

  return {
    data: data ?? null,
    error,
    isLoading,
    isValidating,
    refresh: () => mutate(),
  };
}
