import { useQuery } from '@tanstack/react-query';
import { schedulerService } from '../services/schedulerService';
import { QUERY_KEYS, REFRESH_INTERVALS } from '../constants';

/**
 * Read-only recent slot occurrences for the WebUI Control Center Scheduler panel.
 */
export function useSchedulerSlots(
  limit?: number,
  refetchInterval: number | false = REFRESH_INTERVALS.SCHEDULER
) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.SCHEDULER,
    queryFn: () => schedulerService.listRecentSlots(limit),
    refetchInterval,
  });

  return { slots: data?.slots, scheduler: data?.scheduler, isLoading, error, refetch };
}
