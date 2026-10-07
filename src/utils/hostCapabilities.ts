import { getHostBridge } from './hostBridgeAccess';
import type { HostNotification, HostNotificationResult } from '../types/host-bridge';

/**
 * What the *host* can do for this page — device-facing capabilities only.
 *
 * Some actions have no meaning on the backend: showing a file in Finder, a
 * system notification, the clipboard, opening a URL in the user's browser.
 * Only the machine in front of the user can do them, so the PixivFlow runtime
 * deliberately cannot: `browser -> remote backend -> xdg-open` is meaningless on
 * a server and lies to the user about which machine acts.
 *
 * There are only two shapes of this page, and neither is a bug:
 *
 *  - **hosted** — a desktop host injected `window.pixivflowHost` with native
 *    capabilities. A capability the installed host did not ship is simply
 *    absent, so every member is optional and presence is the feature test.
 *  - **plain server** — Docker, NAS, VPS, Fly.io, a plain browser tab. There is
 *    no host, so `getHostCapabilities()` is an empty snapshot. That is not
 *    "cannot do anything": the *callers* (`revealPath.ts`, `notifications.ts`)
 *    own the browser fallbacks — copying a path, a tab notification, a new
 *    browser tab — and this module only reports what the host itself offers.
 *
 * Callers never touch `window.pixivflowHost` directly, and never branch on "is
 * this Tauri": they ask a caller module for an action and it decides who
 * performs it. A new capability is therefore a change here plus one caller file,
 * not a `typeof` test copied into every page.
 */

export interface HostCapabilities {
  /**
   * Show a path in *this* machine's file manager, "Show in Finder" style: a file
   * is selected inside its folder, a directory is opened.
   *
   * The path is never interpreted here — the backend has already resolved and
   * confined it (`GET /api/files/location`) to a configured download directory.
   *
   * Optional: only a desktop host can do it, and a host older than this
   * capability is a real deployment. `canRevealPath()` is the presence test;
   * the fallback is `copyPath()`.
   */
  revealPath?(path: string): Promise<void>;

  /**
   * Show a system notification on this machine.
   *
   * `title` and `body` arrive already localised by the caller, because the copy
   * belongs to the WebUI, not to the host: the host would otherwise have to
   * learn every message key this product will ever add.
   *
   * Optional: a browser tab falls back to the `Notification` API, permission
   * permitting; `canNotifyNow()` tells the truth about whether a notification
   * would actually be seen.
   */
  notify?(notification: HostNotification): Promise<HostNotificationResult>;

  /**
   * Open an `http(s)` URL in the user's default browser.
   *
   * Optional: a browser tab is already the browser, so the fallback is to ask
   * the browser to open the link.
   */
  openExternal?(url: string): Promise<void>;

  /**
   * Open a URL **inside** the host, in a window the host owns.
   *
   * This is the desktop-shaped alternative to sending the user to a browser:
   * the host can keep its own session, window chrome and back button. There is
   * no browser fallback and there must not be one — opening something *inside
   * the app* is exactly what a web page cannot promise.
   *
   * Optional, and only a host can offer it.
   */
  openUrl?(url: string): Promise<void>;

  /**
   * Put text on this machine's clipboard.
   *
   * Optional, and present only when the *host* provides a clipboard. A page
   * without one still copies text: `copyToClipboard()` falls back to the
   * browser's own clipboard, which every shape of this page has. Hosts
   * implement it to keep copying working under a restrictive permission model.
   */
  copyText?(text: string): Promise<void>;
}

/**
 * Put text on the clipboard with the browser's own API, with the legacy
 * `execCommand` path for insecure origins and older engines. Resolves `false`
 * when neither is available, so callers report an honest failure rather than
 * pretend the text was copied.
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
 * Prefers the host clipboard, then the browser's own, and rejects when neither
 * is available so callers report an honest failure instead of claiming the text
 * was copied.
 */
export async function copyToClipboard(text: string): Promise<void> {
  const hostCopy = getHostCapabilities().copyText;
  if (hostCopy) {
    return hostCopy(text);
  }

  const copied = await copyWithBrowserClipboard(text);
  if (!copied) {
    throw new Error('Clipboard is not available in this environment');
  }
}

/**
 * The capabilities the installed host offers.
 *
 * An empty snapshot means no host — a plain server, where the browser's own
 * capabilities are the answer. Callers must not read it as "the user cannot do
 * this": they ask for the action and the caller module decides who performs it.
 */
export function getHostCapabilities(): HostCapabilities {
  const bridge = getHostBridge();
  if (!bridge) return {};

  const capabilities: HostCapabilities = {};

  const revealPath = bridge.revealPath;
  if (typeof revealPath === 'function') {
    capabilities.revealPath = (path) => revealPath.call(bridge, path);
  }

  const notify = bridge.notify;
  if (typeof notify === 'function') {
    capabilities.notify = (notification) => notify.call(bridge, notification);
  }

  const openExternal = bridge.openExternal;
  if (typeof openExternal === 'function') {
    capabilities.openExternal = (url) => openExternal.call(bridge, url);
  }

  const openUrl = bridge.openUrl;
  if (typeof openUrl === 'function') {
    capabilities.openUrl = (url) => openUrl.call(bridge, url);
  }

  const copyText = bridge.copyText;
  if (typeof copyText === 'function') {
    capabilities.copyText = (text) => copyText.call(bridge, text);
  }

  return capabilities;
}

/**
 * Whether this machine can show a downloaded file in its file manager.
 *
 * `false` means "copy the path instead" — a Docker or NAS user has nothing to
 * open and everything to paste.
 */
export function canRevealPath(): boolean {
  return typeof getHostCapabilities().revealPath === 'function';
}

/** Whether a URL can be opened in a window the host owns. */
export function canOpenUrl(): boolean {
  return typeof getHostCapabilities().openUrl === 'function';
}

/** Whether this runtime has any way to show a system notification at all. */
export function canNotify(): boolean {
  if (typeof getHostCapabilities().notify === 'function') return true;
  return typeof Notification !== 'undefined';
}

/**
 * Whether a notification shown *now* would actually reach the user.
 *
 * A host notification always lands. A browser one depends on permission, and a
 * page that never asked, or whose request was denied, must not report success.
 */
export function canNotifyNow(): boolean {
  if (typeof getHostCapabilities().notify === 'function') return true;
  return typeof Notification !== 'undefined' && Notification.permission === 'granted';
}
