import { getHostBridge } from './hostBridgeAccess';

/**
 * What the *host* can do for this page — device-facing capabilities only.
 *
 * Some actions have no meaning on the backend: showing a file in Finder or
 * Explorer, a system notification, the clipboard. The browser has to do them
 * here, because only this machine knows what the user is looking at. The
 * PixivFlow runtime deliberately cannot: `browser -> remote backend ->
 * xdg-open` is meaningless on a server and misleads the user about which
 * machine opens.
 *
 * The distinction that matters to callers is between the two *shapes* of the
 * page's runtime, not which host provides them:
 *
 *  - **hosted** — a desktop host injected `window.pixivflowHost` with native
 *    capabilities. `revealPath` is available; a capability the installed host
 *    did not ship is simply missing, so every member is optional.
 *  - **plain server** — Docker, NAS, VPS, Fly.io. There is no host at all, so
 *    the honest fallback is the clipboard, not an error.
 *
 * Login windows are capability-shaped too, but they are provided by either the
 * Tauri host or the Electron shell, so they are detected by
 * `getInAppLoginBridge()` in `hostBridge.ts` instead.
 */

export interface HostCapabilities {
  /**
   * Show a path in this machine's file manager, "Show in Finder" style: a file
   * is *selected inside* its folder.
   *
   * The path is never interpreted here — the backend has already resolved and
   * confined it (`GET /api/files/location`) to a configured download directory.
   */
  revealPath(path: string): Promise<void>;
}

/**
 * The capabilities this runtime actually offers, or `null` when the page is
 * served by a plain backend with no desktop host around it.
 *
 * An object is returned as soon as *any* capability exists, so a caller must
 * still test the member it wants: a host that predates `revealPath` is a real
 * deployment, not an error.
 */
export function getHostCapabilities(): HostCapabilities | null {
  const bridge = getHostBridge();
  if (!bridge) return null;

  const capabilities: Partial<HostCapabilities> = {};

  const revealPath = bridge.revealPath;
  if (typeof revealPath === 'function') {
    capabilities.revealPath = (path: string) => revealPath.call(bridge, path);
  }

  return Object.keys(capabilities).length > 0
    ? (capabilities as HostCapabilities)
    : null;
}

/**
 * Whether this machine can show a downloaded file in its file manager.
 *
 * `false` means "copy the path instead" — a Docker or NAS user has nothing to
 * open and everything to paste.
 */
export function canRevealPath(): boolean {
  return typeof getHostCapabilities()?.revealPath === 'function';
}
