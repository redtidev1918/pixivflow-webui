import { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { acquireSocket, releaseSocket, RealtimeSocket } from '../../../services/socket';
import { QUERY_KEYS } from '../../../constants';

/**
 * Hook for managing real-time logs via WebSocket.
 *
 * The backend pushes two shapes on the `logs` channel:
 * - `{ type: 'initial', lines: [...] }` right after connect (hydration)
 * - `{ type: 'new', line }` per appended line
 *
 * We only invalidate React Query caches for appended lines; initial history
 * is fetched by the normal REST query.
 */
export function useLogsRealtime(enabled: boolean) {
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<RealtimeSocket | null>(null);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const sharedSocket = acquireSocket();
    setSocket(sharedSocket);

    const handleLogEvent = (...args: unknown[]): void => {
      const payload = args[0] as { type?: string } | undefined;
      // Only appended lines require a refresh; the initial dump is fetched
      // through the normal REST query.
      if (payload?.type === "new") {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LOGS() });
      }
    };

    sharedSocket.on("logs", handleLogEvent);

    return () => {
      sharedSocket.off("logs", handleLogEvent);
      releaseSocket();
    };
  }, [enabled, queryClient]);

  return socket;
}

/**
 * Hook for auto-scrolling logs table
 */
export function useLogsAutoScroll(
  enabled: boolean,
  autoScroll: boolean,
  logs: unknown[],
  tableRef: React.RefObject<HTMLDivElement>
) {
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (autoScroll && enabled && logs.length > 0) {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        const tableBody = tableRef.current?.querySelector('.ant-table-body');
        if (tableBody) {
          tableBody.scrollTop = tableBody.scrollHeight;
        }
      }, 100);
    }
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [logs, autoScroll, enabled, tableRef]);
}

