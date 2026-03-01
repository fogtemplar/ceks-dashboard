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

  return {
    data: data?.data ?? [],
    updatedAt: data?.updatedAt ?? null,
    error,
    isLoading,
    isValidating,
    refresh: () => mutate(),
  };
}
