/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PairingDialog from '../../pages/Deliveries/components/PairingDialog';
import { useGatewayPairing } from '../../hooks/useDeliveries';
import { ApiError } from '../../services/api';
import type { GatewayPairingResponse } from '../../services/api/types';

jest.mock('../../hooks/useDeliveries', () => ({
  useDeliveries: jest.fn(),
  useGatewayPairing: jest.fn(),
}));

const mockUsePairing = useGatewayPairing as jest.MockedFunction<typeof useGatewayPairing>;

const QR = 'data:image/png;base64,iVBORw0KGgo=';

function pairing(overrides: Partial<GatewayPairingResponse> = {}): GatewayPairingResponse {
  return {
    schemaVersion: 1,
    readOnly: true,
    fetchedAt: '2026-01-01T00:00:00.000Z',
    gateway: 'qq-main',
    type: 'webhook',
    endpoint: 'http://gateway.internal:8080/deliver',
    pairable: true,
    contentType: 'application/json',
    truncated: false,
    payload: {},
    ...overrides,
  };
}

describe('PairingDialog', () => {
  let queryClient: QueryClient;

  const renderDialog = async (gateway: string | null = 'qq-main') => {
    const result = render(
      <QueryClientProvider client={queryClient}>
        <PairingDialog gateway={gateway} onClose={jest.fn()} />
      </QueryClientProvider>,
    );
    // The Modal mounts asynchronously, so settle its state update inside act().
    await act(async () => {
      await Promise.resolve();
    });
    return result;
  };

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    jest.clearAllMocks();
    mockUsePairing.mockReturnValue({
      pairing: undefined,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('renders a QR code the gateway returned as a data URL', async () => {
    mockUsePairing.mockReturnValue({
      pairing: pairing({ payload: { qrCode: QR } }),
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    await renderDialog();

    const image = screen.getByAltText('delivery.pairingImageAlt');
    expect(image).toHaveAttribute('src', QR);
  });

  it('keeps the gateway wording when it says it cannot pair', async () => {
    mockUsePairing.mockReturnValue({
      pairing: pairing({
        pairable: false,
        payload: { errorCode: 'GATEWAY_PAIRING_UNAVAILABLE', note: 'gateway answered 503' },
      }),
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    await renderDialog();

    expect(screen.getByText('delivery.pairingNotReady')).toBeInTheDocument();
    // The gateway's own wording survives verbatim rather than being replaced.
    expect(screen.getByText(/gateway answered 503/)).toBeInTheDocument();
    expect(screen.queryByAltText('delivery.pairingImageAlt')).not.toBeInTheDocument();
  });

  it('shows an informational notice when the route has no pairing endpoint', async () => {
    mockUsePairing.mockReturnValue({
      pairing: undefined,
      isLoading: false,
      error: new ApiError('GATEWAY_PAIRING_UNSUPPORTED', 'this gateway does not expose a pairing endpoint'),
      refetch: jest.fn(),
    });

    await renderDialog();

    expect(screen.getByText('delivery.pairingUnsupported')).toBeInTheDocument();
    // Unsupported is not a failure: no warning is shown for it.
    expect(screen.queryByText('delivery.pairingUnavailable')).not.toBeInTheDocument();
  });

  it('distinguishes a transport failure from a gateway refusal', async () => {
    mockUsePairing.mockReturnValue({
      pairing: undefined,
      isLoading: false,
      error: new ApiError('GATEWAY_PAIRING_UNAVAILABLE', 'connect ECONNREFUSED'),
      refetch: jest.fn(),
    });

    await renderDialog();

    expect(screen.getByText('delivery.pairingUnavailable')).toBeInTheDocument();
    expect(screen.getByText('connect ECONNREFUSED')).toBeInTheDocument();
  });

  it('renders a non-image payload as text instead of guessing', async () => {
    mockUsePairing.mockReturnValue({
      pairing: pairing({ payload: { status: 'waiting', code: 'A1B2' } }),
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    await renderDialog();

    expect(screen.getByText(/"code": "A1B2"/)).toBeInTheDocument();
    expect(screen.queryByAltText('delivery.pairingImageAlt')).not.toBeInTheDocument();
  });

  it('does not read pairing state while the dialog is closed', async () => {
    renderDialog(null);

    expect(mockUsePairing).toHaveBeenCalledWith(null);
  });
});
