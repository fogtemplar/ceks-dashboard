import useSWR from 'swr';
import type { OIHistoryPoint } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface HistoryResponse {
  symbol: string;
  period: string;
  data: OIHistoryPoint[];
}

export function useOIHistory(symbol: string | null, period: string = '1h') {
  const { data, error, isLoading } = useSWR<HistoryResponse>(
    symbol ? `/api/oi/history?symbol=${symbol}&period=${period}` : null,
    fetcher,
    {
      refreshInterval: 300_000,
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  return {
    data: data?.data ?? [],
    error,
    isLoading,
  };
}
