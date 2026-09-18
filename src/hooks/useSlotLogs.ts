import { useQuery } from '@tanstack/react-query';
import { schedulerService } from '../services/schedulerService';
import { QUERY_KEYS } from '../constants';

/**
 * Correlated log view: one slot -> its target lines from the process log.
 */
export function useSlotLogs(slotId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.SCHEDULER_SLOT_LOGS(slotId ?? ''),
    queryFn: () => schedulerService.getSlotLogs(slotId as string),
    enabled: Boolean(slotId),
  });
}
