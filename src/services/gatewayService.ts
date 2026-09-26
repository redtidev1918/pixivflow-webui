import { deliveriesApi, gatewaysApi } from './api';
import type { DeliveriesQuery } from './api/types';

/**
 * Gateway service — the read-only delivery-plane projection.
 *
 * One service covers both panels because they are two views of one thing: the
 * gateway ROUTES PixivFlow delivers through, and the durable per-route ledger
 * that records what happened. `listDeliveries` is a projection of the existing
 * ledger, not a second state system, so nothing here writes.
 */
export const gatewayService = {
  async listGateways() {
    const response = await gatewaysApi.list();
    return response.data.data;
  },

  async getGateway(name: string, limit?: number) {
    const response = await gatewaysApi.get(name, { limit });
    return response.data.data;
  },

  /**
   * Relay the gateway's own pairing answer. `pairable: false` means the gateway
   * said it cannot pair right now and `payload` carries its original wording —
   * the UI must show that, not a generic failure.
   */
  async getPairing(name: string) {
    const response = await gatewaysApi.pairing(name);
    return response.data.data;
  },

  async listDeliveries(params?: DeliveriesQuery) {
    const response = await deliveriesApi.list(params);
    return response.data.data;
  },

  async getDelivery(id: string) {
    const response = await deliveriesApi.get(id);
    return response.data.data;
  },
};

export { deliveriesApi };
