import { schedulerApi } from './api';
import { RecoveryRequest } from './api/types';

/**
 * Scheduler service — returns the read-only recent slot occurrences and
 * forwards retry/recovery through the server-side trigger proxy.
 */
export const schedulerService = {
  async listRecentSlots(limit?: number) {
    const response = await schedulerApi.listRecentSlots(limit);
    return response.data.data;
  },
  async submitRecover(targetId: string, payload: RecoveryRequest) {
    const response = await schedulerApi.submitRecover(targetId, payload);
    return response.data;
  },
  async recoverStatus(targetId: string, requestId: string) {
    const response = await schedulerApi.recoverStatus(targetId, requestId);
    return response.data;
  },
  async listExecutions(params?: { limit?: number; targetId?: string; status?: string }) {
    const response = await schedulerApi.listExecutions(params);
    return response.data.data;
  },
  async getSlotLogs(slotId: string) {
    const response = await schedulerApi.getSlotLogs(slotId);
    return response.data.data;
  },
};
