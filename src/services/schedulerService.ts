import { schedulerApi } from './api';

/**
 * Scheduler service — returns the read-only recent slot occurrences.
 */
export const schedulerService = {
  async listRecentSlots(limit?: number) {
    const response = await schedulerApi.listRecentSlots(limit);
    return response.data.data;
  },
};
