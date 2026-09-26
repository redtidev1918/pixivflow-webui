import type { HostLoginBridge } from '../types/host-bridge';
import { getHostBridge } from './hostBridgeAccess';

/**
 * Get the desktop host login bridge, if the page runs inside a host that
 * injects `window.pixivflowHost`.
 *
 * This repository has exactly one way to show an in-app login window, and the
 * host owns it. Any shell that wants one implements the bridge documented in
 * `docs/DESKTOP_HOST.md`; a page that has none falls back to the backend's
 * visible-browser flow, which works in a plain browser too.
 */
export function getHostLoginBridge(): HostLoginBridge | null {
  return getHostBridge();
}

/**
 * Whether an in-app login window is available in this runtime.
 */
export function hasInAppLoginWindow(): boolean {
  return getHostLoginBridge() !== null;
}
