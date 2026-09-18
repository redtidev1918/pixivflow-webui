import { AxiosResponse } from 'axios';
import { apiClient } from './client';
import { ApiResponse, SchedulerSlotsResponse } from './types';

/**
 * Scheduler API service — read-only Control Center Phase 1 projection. This is
 * deliberately read-only: slots live in PixivFlow's durable Slot Ledger and
 * actions (if ever added) go through the existing Recovery/Scheduler contracts.
 */
export const schedulerApi = {
  listRecentSlots: (
    limit?: number,
  ): Promise<AxiosResponse<ApiResponse<SchedulerSlotsResponse>>> =>
    apiClient.get('/scheduler', { params: { limit } }),
};
