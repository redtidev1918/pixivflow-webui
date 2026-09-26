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
 * Login windows are capability-shaped too, but only a desktop host provides
 * them, so they are detected by `getHostLoginBridge()` in `hostBridge.ts`.
 *
 * Callers never touch `window.pixivflowHost` directly:
 * they ask `pathActions` for an action and this module decides who performs it,
 * so a new capability stays a change in one file instead of a `typeof` test
 * copied into every page.
 */

export interface HostCapabilities {
  /**
   * Put text on this machine's clipboard, where the user can paste it into a
   * terminal, a file manager or a chat window.
   *
   * Always present: the browser clipboard is a real capability of every shape
   * of this page, so a plain server (Docker, NAS, VPS, Fly.io) has a useful
   * answer for "where is my file" instead of an error.
   */
  copyText(text: string): Promise<void>;

  /**
   * Show a path in this machine's file manager, "Show in Finder" style: a file
   * is *selected inside* its folder.
   *
   * The path is never interpreted here — the backend has already resolved and
   * confined it (`GET /api/files/location`) to a configured download directory.
   *
   * Optional: only a desktop host can do it, and a host older than this
   * capability is a real deployment — `getHostCapabilities()?.revealPath` is
   * the presence test, never a required member.
   */
  revealPath?(path: string): Promise<void>;
}

/**
 * Put text on the clipboard without a host: the browser's own API, with the
 * old `execCommand` path for insecure origins and older engines. Resolves
 * `false` when neither is available, so callers can report an honest failure
 * rather than pretend the text was copied.
 */
async function copyWithBrowserClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or a non-secure context; fall through.
    }
  }

  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') {
    return false;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);

  try {
    textarea.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

/**
 * Put text on this machine's clipboard, with or without a desktop host.
 *
 * Exported for the path actions: a plain server has no host to ask, and its
 * clipboard answer must not depend on this module saying so. Prefers whatever
 * clipboard the host provides, then the browser's own.
 *
 * Rejects when neither clipboard is available, so callers report an honest
 * failure instead of claiming the text was copied.
 */
export async function copyToClipboard(text: string): Promise<void> {
  const hostCopy = getHostCapabilities()?.copyText;
  if (hostCopy) {
    return hostCopy(text);
  }

  const copied = await copyWithBrowserClipboard(text);
  if (!copied) {
    throw new Error('Clipboard is not available in this environment');
  }
}

/**
 * The capabilities a desktop host offers, or `null` when there is no host.
 *
 * `null` means "no host" — a plain server, where the browser's own clipboard is
 * the answer and `copyPath()` uses it without asking here first. Callers must
 * not read `null` as "the user cannot do this"; they ask `pathActions` for the
 * action and this module decides who performs it.
 */
export function getHostCapabilities(): HostCapabilities | null {
  const bridge = getHostBridge();
  if (!bridge) return null;

  const capabilities: Partial<HostCapabilities> = {};

  const copyText = typeof bridge.copyText === 'function' ? bridge.copyText : null;
  capabilities.copyText = copyText
    ? (text: string) => copyText.call(bridge, text)
    : async (text: string) => {
        const copied = await copyWithBrowserClipboard(text);
        if (!copied) {
          throw new Error('Clipboard is not available in this environment');
        }
      };

  const revealPath = bridge.revealPath;
  if (typeof revealPath === 'function') {
    capabilities.revealPath = (path: string) => revealPath.call(bridge, path);
  }

  return capabilities as HostCapabilities;
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
