import { AxiosResponse } from 'axios';
import { apiClient } from './client';
import { ApiResponse, RecoveryRequest, SchedulerSlotsResponse } from './types';

/**
 * Scheduler API service — Control Center Scheduler projection.
 *
 * Slots remain a read-only projection of PixivFlow's durable Slot Ledger;
 * REPLACEMENT/recovery writes only run through a server-side proxy to the
 * existing authenticated scheduler dispatcher (the browser never sees the
 * trigger token).
 */
export const schedulerApi = {
  listRecentSlots: (
    limit?: number,
  ): Promise<AxiosResponse<ApiResponse<SchedulerSlotsResponse>>> =>
    apiClient.get('/scheduler', { params: { limit } }),

  submitRecover: (
    targetId: string,
    payload: RecoveryRequest,
  ): Promise<AxiosResponse<unknown>> =>
    apiClient.post(`/scheduler/targets/${encodeURIComponent(targetId)}/recover`, payload),

  recoverStatus: (
    targetId: string,
    requestId: string,
  ): Promise<AxiosResponse<unknown>> =>
    apiClient.get(
      `/scheduler/targets/${encodeURIComponent(targetId)}/recover/${encodeURIComponent(requestId)}`
    ),
};
