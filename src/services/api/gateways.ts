import { AxiosResponse } from 'axios';
import { apiClient } from './client';
import {
  ApiResponse,
  GatewayDetailResponse,
  GatewayPairingResponse,
  GatewaysResponse,
} from './types';

/**
 * Gateway API service — read-only projection of PixivFlow's delivery plane.
 *
 * The backend owns every fact here: which routes are declared in config, what
 * each route can carry, the last observed connection state and the durable
 * delivery ledger. This client only reads.
 *
 * Pairing is relayed, never performed: `/gateways/:name/pairing` returns
 * whatever the gateway process itself answered. PixivFlow does not generate
 * the QR code, does not run the login protocol and never stores a session.
 */
export const gatewaysApi = {
  list: (): Promise<AxiosResponse<ApiResponse<GatewaysResponse>>> =>
    apiClient.get('/gateways'),

  get: (
    name: string,
    params?: { limit?: number },
  ): Promise<AxiosResponse<ApiResponse<GatewayDetailResponse>>> =>
    apiClient.get(`/gateways/${encodeURIComponent(name)}`, { params }),

  pairing: (name: string): Promise<AxiosResponse<ApiResponse<GatewayPairingResponse>>> =>
    apiClient.get(`/gateways/${encodeURIComponent(name)}/pairing`),
};
