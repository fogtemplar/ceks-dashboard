import { useEffect, useRef } from 'react';
import useSWR from 'swr';
import type { DashboardResponse } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useOIData() {
  const { data, error, isLoading, isValidating, mutate } =
    useSWR<DashboardResponse>('/api/oi', fetcher, {
      refreshInterval: 60_000,
      revalidateOnFocus: true,
      dedupingInterval: 30_000,
      keepPreviousData: true,
      errorRetryCount: 3,
      errorRetryInterval: 5_000,
    });

  const warmedRef = useRef(false);

  // When initial data is partial (500 coins), trigger background warm
  // then re-fetch to get full data with 3000 coins
  useEffect(() => {
    if (!data?.isPartial || warmedRef.current) return;
    warmedRef.current = true;

    fetch('/api/supply/warm', { method: 'POST' })
      .then((r) => r.json())
      .then((result) => {
        if (result.status === 'warmed') {
          // Full supply cache is ready - invalidate OI cache so next fetch uses it
          mutate();
        }
      })
      .catch(() => {
        // Warm failed, will retry on next page load
      });
  }, [data?.isPartial, mutate]);

  return {
    data: data?.data ?? [],
    updatedAt: data?.updatedAt ?? null,
    isPartial: data?.isPartial ?? false,
    error,
    isLoading,
    isValidating,
    refresh: () => mutate(),
  };
}
