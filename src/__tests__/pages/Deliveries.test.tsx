/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Deliveries from '../../pages/Deliveries';
import { useDeliveries, useGatewayPairing } from '../../hooks/useDeliveries';
import { useGateways } from '../../hooks/useGateways';
import type { DeliveryRecord, GatewayRoute } from '../../services/api/types';

jest.mock('../../hooks/useDeliveries', () => ({
  useDeliveries: jest.fn(),
  useGatewayPairing: jest.fn(),
}));
jest.mock('../../hooks/useGateways', () => ({
  useGateways: jest.fn(),
  useGatewayDetail: jest.fn(),
}));

const mockUseGateways = useGateways as jest.MockedFunction<typeof useGateways>;
const mockUseDeliveries = useDeliveries as jest.MockedFunction<typeof useDeliveries>;
const mockUsePairing = useGatewayPairing as jest.MockedFunction<typeof useGatewayPairing>;


/**
 * The test i18n resolves keys to real strings in some runs and returns the key
 * verbatim in others, so match either form instead of assuming one.
 */
const label = (key: string, english: string) =>
  new RegExp(`^(${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${english})$`);

function route(overrides: Partial<GatewayRoute> = {}): GatewayRoute {
  return {
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
    ...overrides,
  };
}

function record(overrides: Partial<DeliveryRecord> = {}): DeliveryRecord {
  return {
    id: 'd1',
    deliveryTarget: 'qq-main',
    workType: 'illustration',
    pixivId: '12345678',
    status: 'failed',
    attempts: 3,
    lastError: 'group is archived',
    slotId: 'daily-hot',
    updatedAt: '2026-01-01T01:00:00.000Z',
    outboxStatus: 'done',
    ...overrides,
  };
}

describe('Deliveries', () => {
  let queryClient: QueryClient;

  /**
   * antd's Table/Tabs measure layout in a microtask, so let React settle the
   * resulting state update inside act() instead of leaking it after the test.
   */
  const renderPage = async () => {
    const result = render(
      <QueryClientProvider client={queryClient}>
        <Deliveries />
      </QueryClientProvider>,
    );
    await act(async () => {
      await Promise.resolve();
    });
    return result;
  };

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    jest.clearAllMocks();

    mockUseGateways.mockReturnValue({
      gateways: [route()],
      unconfigured: [],
      pairingSupported: true,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUseDeliveries.mockReturnValue({
      deliveries: [record()],
      counts: { pending: 1, delivered: 2, duplicate: 0, failed: 1 },
      perRoute: {},
      routes: [{ name: 'qq-main', type: 'webhook', enabled: true }],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUsePairing.mockReturnValue({
      pairing: undefined,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('renders the delivery panel with both read-only tabs', async () => {
    await renderPage();

    expect(screen.getByText('delivery.title')).toBeInTheDocument();
    expect(screen.getByText('delivery.tabGateways')).toBeInTheDocument();
    expect(screen.getByText('delivery.tabHistory')).toBeInTheDocument();
  });

  it('shows a configured route with its capability and connection state', async () => {
    await renderPage();

    expect(screen.getByText('qq-main')).toBeInTheDocument();
    expect(screen.getByText('webhook')).toBeInTheDocument();
    // 'text' is the only capability an unknown/limited gateway declares.
    expect(screen.getByText('text')).toBeInTheDocument();
    expect(screen.getByText(label('delivery.status.connected', 'connected'))).toBeInTheDocument();
    expect(screen.getByText('delivery.pair')).toBeInTheDocument();
  });

  it('reports text-only capability instead of promising media', async () => {
    mockUseGateways.mockReturnValue({
      gateways: [route({ connectionStatus: 'unknown', pairingSupported: false })],
      unconfigured: [],
      pairingSupported: false,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    await renderPage();

    expect(screen.getByText(label('delivery.status.unknown', 'unknown'))).toBeInTheDocument();
    // No pairing endpoint means no pairing action at all.
    expect(screen.queryByText('delivery.pair')).not.toBeInTheDocument();
    expect(screen.getByText('delivery.pairingUnavailableShort')).toBeInTheDocument();
  });

  it('surfaces dangling connection records instead of hiding them', async () => {
    mockUseGateways.mockReturnValue({
      gateways: [route()],
      unconfigured: [
        {
          name: 'removed-gateway',
          type: 'webhook',
          endpoint: 'http://old.internal/deliver',
          connectionStatus: 'unreachable',
          connectionUpdatedAt: null,
        },
      ],
      pairingSupported: true,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    await renderPage();

    expect(screen.getByText('delivery.unconfiguredTitle')).toBeInTheDocument();
    expect(screen.getByText('removed-gateway')).toBeInTheDocument();
  });

  it('shows the per-route failure reason and ledger status in history', async () => {
    const user = userEvent.setup();
    await renderPage();

    // A discrete click on an antd tab still schedules work (ink bar + panel
    // mount), so drive the event inside act() and let it settle.
    await act(async () => {
      await user.click(screen.getByText('delivery.tabHistory'));
    });

    expect(screen.getByText('group is archived')).toBeInTheDocument();
    expect(screen.getByText(label('delivery.deliveryStatusLabel.failed', 'failed'))).toBeInTheDocument();
    expect(screen.getByText('daily-hot')).toBeInTheDocument();
  });

  it('shows an empty state when nothing is configured', async () => {
    mockUseGateways.mockReturnValue({
      gateways: [],
      unconfigured: [],
      pairingSupported: false,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    await renderPage();

    expect(screen.getByText('delivery.noGateways')).toBeInTheDocument();
    expect(screen.getByText('delivery.noGatewaysHint')).toBeInTheDocument();
  });

  it('renders a load failure without pretending the list is empty', async () => {
    mockUseGateways.mockReturnValue({
      gateways: undefined,
      unconfigured: undefined,
      pairingSupported: false,
      isLoading: false,
      error: new Error('boom') as never,
      refetch: jest.fn(),
    });
    mockUseDeliveries.mockReturnValue({
      deliveries: undefined,
      counts: undefined,
      perRoute: undefined,
      routes: undefined,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    await renderPage();

    expect(screen.getByText('delivery.loadFailed')).toBeInTheDocument();
  });
});
