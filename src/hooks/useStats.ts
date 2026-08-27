import { useQuery } from '@tanstack/react-query';
import { statsService } from '../services/statsService';
import { QUERY_KEYS, REFRESH_INTERVALS } from '../constants';

/**
 * Hook for getting overview statistics
 * @param refetchInterval - Auto-refresh interval in milliseconds (default: 5000ms)
 */
export function useStatsOverview(refetchInterval: number | false = REFRESH_INTERVALS.STATS_OVERVIEW) {
  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.STATS_OVERVIEW,
    queryFn: () => statsService.getStatsOverview(),
    refetchInterval: refetchInterval,
  });

  return {
    stats,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook for getting download statistics
 */
export function useDownloadStats(period?: string) {
  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.STATS_DOWNLOADS(period),
    queryFn: () => statsService.getDownloadStats(period),
  });

  return {
    stats,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook for getting tag statistics
 */
export function useTagStats(limit?: number) {
  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.STATS_TAGS(limit),
    queryFn: () => statsService.getTagStats(limit),
  });

  return {
    stats,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook for getting author statistics
 */
export function useAuthorStats(limit?: number) {
  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.STATS_AUTHORS(limit),
    queryFn: () => statsService.getAuthorStats(limit),
  });

  return {
    stats,
    isLoading,
    error,
    refetch,
  };
}

