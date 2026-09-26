/**
 * Tests for gatewayService — the read-only delivery-plane projection.
 *
 * The service is a thin unwrapper: what matters is that it reads the documented
 * endpoints, unwraps `data.data`, and passes the delivery filters through
 * unchanged. It must also never grow a write path: pairing is a GET relay, not
 * a submit.
 */

import { gatewayService } from '../../services/gatewayService';
import { deliveriesApi, gatewaysApi } from '../../services/api';
import type { DeliveriesResponse, GatewayPairingResponse, GatewaysResponse } from '../../services/api/types';

jest.mock('../../services/api', () => ({
  gatewaysApi: {
    list: jest.fn(),
    get: jest.fn(),
    pairing: jest.fn(),
  },
  deliveriesApi: {
    list: jest.fn(),
    get: jest.fn(),
  },
}));

const mockGatewaysApi = gatewaysApi as jest.Mocked<typeof gatewaysApi>;
const mockDeliveriesApi = deliveriesApi as jest.Mocked<typeof deliveriesApi>;

const gatewaysPayload: GatewaysResponse = {
  schemaVersion: 1,
  pairingSupported: true,
  gateways: [
    {
      name: 'qq-main',
      type: 'webhook',
      endpoint: 'http://gateway.internal:8080/deliver',
      enabled: true,
      pairingSupported: true,
      connectionStatus: 'connected',
      connectionUpdatedAt: '2026-01-01T00:00:00.000Z',
      capabilities: {
        type: 'webhook',
        supported: ['text'],
        maxTextLength: 4096,
        maxCaptionLength: 0,
        maxUploadBytes: 0,
        maxAttachmentsPerMessage: 0,
        album: null,
        requiresTwoPhaseUpload: false,
        minSendIntervalMs: 0,
        truncatePolicy: 'error',
        idempotencyMechanism: 'upstream_ledger',
      },
      deliveryCounts: { pending: 1, delivered: 2, duplicate: 0, failed: 1 },
    },
  ],
  unconfigured: [],
};

const deliveriesPayload: DeliveriesResponse = {
  schemaVersion: 1,
  readOnly: true,
  routes: [{ name: 'qq-main', type: 'webhook', enabled: true }],
  counts: { pending: 1, delivered: 2, duplicate: 0, failed: 1 },
  perRoute: { 'qq-main': { pending: 1, delivered: 2, duplicate: 0, failed: 1 } },
  deliveries: [
    {
      id: 'd1',
      deliveryTarget: 'qq-main',
      workType: 'illustration',
      pixivId: '12345678',
      status: 'failed',
      attempts: 3,
      lastError: 'group is archived',
      slotId: 'daily-hot',
      updatedAt: '2026-01-01T01:00:00.000Z',
    },
  ],
};

describe('gatewayService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('unwraps the gateway list payload', async () => {
    mockGatewaysApi.list.mockResolvedValue({ data: { data: gatewaysPayload } } as never);

    const result = await gatewayService.listGateways();

    expect(mockGatewaysApi.list).toHaveBeenCalledTimes(1);
    expect(result.gateways[0].name).toBe('qq-main');
    expect(result.pairingSupported).toBe(true);
  });

  it('forwards the history limit to one gateway detail read', async () => {
    mockGatewaysApi.get.mockResolvedValue({
      data: { data: { ...gatewaysPayload.gateways[0], schemaVersion: 1, history: [] } },
    } as never);

    await gatewayService.getGateway('qq-main', 50);

    expect(mockGatewaysApi.get).toHaveBeenCalledWith('qq-main', { limit: 50 });
  });

  it('relays the gateway pairing answer without interpreting it', async () => {
    const pairing: GatewayPairingResponse = {
      schemaVersion: 1,
      readOnly: true,
      fetchedAt: '2026-01-01T00:00:00.000Z',
      gateway: 'qq-main',
      type: 'webhook',
      endpoint: 'http://gateway.internal:8080/deliver',
      // The gateway said "not right now"; the payload must survive verbatim.
      pairable: false,
      contentType: 'application/json',
      truncated: false,
      payload: { status: 'waiting', note: 'scan within 60s' },
    };
    mockGatewaysApi.pairing.mockResolvedValue({ data: { data: pairing } } as never);

    const result = await gatewayService.getPairing('qq-main');

    expect(mockGatewaysApi.pairing).toHaveBeenCalledWith('qq-main');
    expect(result.pairable).toBe(false);
    expect(result.payload).toEqual({ status: 'waiting', note: 'scan within 60s' });
  });

  it('passes delivery filters through unchanged', async () => {
    mockDeliveriesApi.list.mockResolvedValue({ data: { data: deliveriesPayload } } as never);

    const result = await gatewayService.listDeliveries({
      status: 'failed',
      target: 'qq-main',
      limit: 10,
    });

    expect(mockDeliveriesApi.list).toHaveBeenCalledWith({
      status: 'failed',
      target: 'qq-main',
      limit: 10,
    });
    expect(result.deliveries[0].lastError).toBe('group is archived');
  });

  it('exposes no write path for the delivery plane', () => {
    const surface = Object.keys(gatewayService);
    for (const method of surface) {
      expect(method).not.toMatch(/retry|cancel|submit|pair\b|delete|create|update/i);
    }
  });
});
