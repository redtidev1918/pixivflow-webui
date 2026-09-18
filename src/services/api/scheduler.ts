import { AxiosResponse } from 'axios';
import { apiClient } from './client';
import {
  ApiResponse,
  RecoveryRequest,
  SchedulerExecutionsResponse,
  SchedulerSlotsResponse,
  SlotLogsResponse,
} from './types';

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

  listExecutions: (
    params?: { limit?: number; targetId?: string; status?: string },
  ): Promise<AxiosResponse<ApiResponse<SchedulerExecutionsResponse>>> =>
    apiClient.get('/scheduler/executions', { params }),

  getSlotLogs: (
    slotId: string,
  ): Promise<AxiosResponse<ApiResponse<SlotLogsResponse>>> =>
    apiClient.get(`/scheduler/slots/${encodeURIComponent(slotId)}/logs`),
};
