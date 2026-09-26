import { AxiosResponse } from 'axios';
import { apiClient } from './client';
import { ApiResponse, DeliveriesResponse, DeliveriesQuery, DeliveryRecord } from './types';

/**
 * Delivery API service — read-only view of the durable delivery ledger.
 *
 * The ledger is the authority; the outbox join only tells the operator whether
 * anything still intends to attempt a route. There is deliberately no retry or
 * cancel call here: replaying a failed route is an operator action on the
 * server side (`pixivflow delivery retry`), not a browser button.
 */
export const deliveriesApi = {
  list: (
    params?: DeliveriesQuery,
  ): Promise<AxiosResponse<ApiResponse<DeliveriesResponse>>> =>
    apiClient.get('/deliveries', { params }),

  get: (id: string): Promise<AxiosResponse<ApiResponse<DeliveryRecord>>> =>
    apiClient.get(`/deliveries/${encodeURIComponent(id)}`),
};
