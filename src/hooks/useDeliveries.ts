import { useQuery } from '@tanstack/react-query';
import { gatewayService } from '../services/gatewayService';
import { QUERY_KEYS, REFRESH_INTERVALS } from '../constants';
import type { DeliveriesQuery } from '../services/api/types';

/**
 * Read-only delivery ledger history, optionally narrowed by status/route.
 *
 * The ledger is the authority and the outbox join only says whether anything
 * still intends to retry, so this hook never triggers a write.
 */
export function useDeliveries(
  params?: DeliveriesQuery,
  refetchInterval: number | false = REFRESH_INTERVALS.DELIVERIES,
) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.DELIVERIES(params),
    queryFn: () => gatewayService.listDeliveries(params),
    refetchInterval,
  });

  return {
    deliveries: data?.deliveries,
    counts: data?.counts,
    perRoute: data?.perRoute,
    routes: data?.routes,
    isLoading,
    error,
    refetch,
  };
}

/** The gateway's own pairing answer, relayed by PixivFlow. */
export function useGatewayPairing(name: string | null) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.GATEWAY_PAIRING(name ?? ''),
    queryFn: () => gatewayService.getPairing(name as string),
    enabled: Boolean(name),
    // Pairing is an operator-initiated read: never poll it.
    refetchInterval: false,
    retry: false,
  });

  return { pairing: data, isLoading, error, refetch };
}
