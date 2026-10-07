import { useQuery } from '@tanstack/react-query';
import { gatewayService } from '../services/gatewayService';
import { QUERY_KEYS, REFRESH_INTERVALS } from '../constants';

/**
 * Read-only gateway routes for the WebUI Delivery panel.
 *
 * `connectionStatus` is PixivFlow's last observation of the gateway's own
 * pairing state, so a slow poll is correct: nothing here pairs or probes.
 */
export function useGateways(
  refetchInterval: number | false = REFRESH_INTERVALS.GATEWAYS,
) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.GATEWAYS,
    queryFn: () => gatewayService.listGateways(),
    refetchInterval,
  });

  return {
    gateways: data?.gateways,
    unconfigured: data?.unconfigured,
    pairingSupported: data?.pairingSupported ?? false,
    isLoading,
    error,
    refetch,
  };
}

/** One route's declared capabilities plus its most recent delivery facts. */
export function useGatewayDetail(name: string | null, limit?: number) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.GATEWAY_DETAIL(name ?? ''),
    queryFn: () => gatewayService.getGateway(name as string, limit),
    enabled: Boolean(name),
  });

  return { gateway: data, isLoading, error, refetch };
}
