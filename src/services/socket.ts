import * as socketIoModule from 'socket.io-client';

/**
 * Shared Socket.IO connection for realtime channels (logs, download).
 *
 * The server broadcasts to everyone, so a single lazily-created connection is
 * enough; hooks subscribe with socket.on(...) and release their slot on
 * unmount via the ref-counted helper below.
 *
 * Notes:
 * - Deliberately avoids `import.meta` so the module stays consumable from
 *   both the Vite browser bundle and the CommonJS Jest environment.
 * - Tolerates the repo's non-esModuleInterop build by resolving the client
 *   factory whether the module interop exposes it as default or top-level.
 */

export interface RealtimeSocket {
  id?: string;
  connected?: boolean;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler?: (...args: unknown[]) => void): void;
  emit(event: string, ...args: unknown[]): void;
  close(): void;
}

interface SocketEnv {
  VITE_DEV_API_PORT?: string;
  [key: string]: string | undefined;
}

function readGlobalEnv(): SocketEnv | undefined {
  return (globalThis as { __VITE_ENV__?: SocketEnv }).__VITE_ENV__;
}

/**
 * Dev mode talks straight to the backend dev API port; production serves the
 * frontend from the same origin as the API (empty base = relative connect).
 * In tests (NODE_ENV=test) we behave like production unless a mock provides a
 * port, keeping realtime wiring inert but importable.
 */
function resolveApiUrl(): string {
  const env = readGlobalEnv();
  const nodeEnv = typeof process !== 'undefined' && process.env ? process.env : undefined;

  if (nodeEnv?.NODE_ENV === 'production') return '';
  if (nodeEnv?.NODE_ENV === 'test') return '';

  const devPort = env?.VITE_DEV_API_PORT || nodeEnv?.VITE_DEV_API_PORT || '3000';
  return `http://localhost:${devPort}`;
}

function resolveIoFactory(): (
  uri: string,
  opts: Record<string, unknown>
) => RealtimeSocket {
  const mod = socketIoModule as unknown as Record<string, unknown> &
    ((...args: unknown[]) => unknown);
  const candidate =
    typeof socketIoModule === 'function'
      ? (socketIoModule as unknown)
      : typeof mod.default === 'function'
        ? mod.default
        : mod.io;
  if (typeof candidate !== 'function') {
    throw new Error('socket.io-client factory could not be resolved');
  }
  return candidate as unknown as (
    uri: string,
    opts: Record<string, unknown>
  ) => RealtimeSocket;
}

let socket: RealtimeSocket | null = null;
let consumers = 0;

export function acquireSocket(): RealtimeSocket {
  consumers += 1;
  if (!socket) {
    socket = resolveIoFactory()(resolveApiUrl(), {
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

/** Release one consumer; closes the underlying connection at zero. */
export function releaseSocket(): void {
  consumers = Math.max(0, consumers - 1);
  if (consumers === 0 && socket) {
    socket.close();
    socket = null;
  }
}

export type DownloadSnapshotPayload = {
  kind: 'snapshot';
  timestamp: string;
  status: {
    hasActiveTask: boolean;
    activeTask: unknown;
    allTasks: unknown[];
  };
};
