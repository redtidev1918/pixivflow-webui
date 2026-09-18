import { useQuery } from '@tanstack/react-query';
import { schedulerService } from '../services/schedulerService';
import { QUERY_KEYS } from '../constants';

/**
 * Read-only Execution projection of the durable Slot Ledger.
 */
export function useSchedulerExecutions(params?: { targetId?: string; status?: string }) {
  const {
    data: executionsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.SCHEDULER_EXECUTIONS,
    queryFn: () => schedulerService.listExecutions({ limit: 100, ...params }),
  });

  return { executions: executionsData?.executions ?? [], isLoading, error, refetch };
}
