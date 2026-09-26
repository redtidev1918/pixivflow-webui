/**
 * Desktop host bridge type definitions
 *
 * The desktop host (e.g. the Tauri app wrapping this WebUI in a webview) may
 * inject `window.pixivflowHost` so the page can use capabilities only the
 * machine in front of the user has: an in-app Pixiv authorization window, a
 * file manager, a system notification, the user's browser.
 *
 * This is a capability declaration, not a business interface: the UI never
 * talks to Pixiv itself and never receives tokens from the host — it forwards
 * the authorization code to the backend, which performs the OAuth token
 * exchange. The backend can never do the device-facing half (`browser ->
 * remote backend -> xdg-open` is meaningless on a server), which is why the
 * split exists.
 *
 * Every member except `openLoginWindow` is optional: a host release older than
 * a capability is a real deployment, and absence is how the page learns to use
 * its browser fallback. Probe through `src/utils/hostCapabilities.ts` (which
 * exposes the presence helpers) rather than reading this global.
 */

/** How a system notification should present itself. */
export type HostNotificationLevel = 'info' | 'success' | 'warning' | 'error';

/**
 * A system notification, already localised by the caller.
 *
 * The copy is the WebUI's, not the host's: the host would otherwise have to
 * learn every message key this product will ever add.
 */
export interface HostNotification {
  /** Single-line summary, usually the outcome ("Download complete"). */
  title: string;
  /** One or two sentences of detail; the host decides how much fits. */
  body: string;
  /** Presentation only — never a reason to suppress the notification. */
  level?: HostNotificationLevel;
}

/**
 * What actually happened to a notification.
 *
 * `denied` is a normal answer, not an error: the user (or the OS) refused the
 * channel, and a caller that reports success anyway is lying to the user.
 */
export interface HostNotificationResult {
  shown: boolean;
  reason?: 'denied';
}

export interface HostLoginBridge {
  /**
   * Show the Pixiv authorize page in an in-app window provided by the host.
   *
   * @param authUrl - The Pixiv authorize URL returned by
   *   `POST /api/auth/login/host/start`.
   * @param redirectUri - The redirect URI the host must watch for. Once the
   *   window lands on it, the host extracts the `code` query parameter.
   * @returns Resolves with `{ code }` once the redirect was observed, or with
   *   `{ code: null }` when the user closed the window or it timed out.
   */
  openLoginWindow(
    authUrl: string,
    redirectUri: string
  ): Promise<{ code: string | null }>;

  /**
   * Show a path in *this* machine's file manager — "Show in Finder" semantics:
   * a file is selected inside its folder, a directory is opened.
   *
   * The WebUI uses this when it runs inside a desktop host, because the
   * backend may be on another machine and only the host can open a window the
   * user can see. The backend still resolves and confines every path first
   * (`GET /api/files/location`); the host only shows what it is handed and
   * never re-derives it.
   *
   * Optional: a host that predates this capability simply omits it, and the
   * UI copies the path instead. Probe it through `canRevealPath()`.
   *
   * @param path - Absolute path to reveal.
   * @returns Resolves once the file manager was asked to show it; rejects when
   *   the path is not on this machine or the OS refused.
   */
  revealPath?(path: string): Promise<void>;

  /**
   * Show a system notification on *this* machine.
   *
   * The page decides *whether* something is worth interrupting the user for;
   * the host only renders it. A host may map `level` onto its own visual
   * language, and must not silently drop a notification — resolve
   * `{ shown: false, reason: 'denied' }` instead.
   *
   * Optional: without it the page falls back to the browser `Notification`
   * API, permission permitting. Probe it through `canNotify()` /
   * `canNotifyNow()`.
   */
  notify?(notification: HostNotification): Promise<HostNotificationResult>;

  /**
   * Open an `http(s)` URL in the user's default browser.
   *
   * Optional: a browser tab is already the browser, so the page can fall back
   * to opening the link itself. Use `openUrl` when the point is to stay inside
   * the app.
   *
   * @param url - Absolute `http(s)` URL. The page keeps URLs inside links the
   *   product itself renders; it never forwards a user-supplied string.
   */
  openExternal?(url: string): Promise<void>;

  /**
   * Open a URL **inside** the host, in a window the host owns.
   *
   * This is the desktop-shaped alternative to sending the user to a browser:
   * the host keeps its own session, window chrome and back button. There is no
   * browser fallback and there must not be one — promising something *inside
   * the app* is exactly what a web page cannot do.
   *
   * Optional, and only a host can provide it.
   */
  openUrl?(url: string): Promise<void>;

  /**
   * Put text on *this* machine's clipboard.
   *
   * Optional: when the host does not provide it the WebUI uses the browser
   * clipboard, which every shape of this page has. A host can implement it to
   * keep clipboard access working under a restrictive permission model.
   *
   * @param text - Text to place on the clipboard.
   * @returns Resolves once the clipboard holds the text; rejects when the host
   *   could not write it.
   */
  copyText?(text: string): Promise<void>;
}

/**
 * Extended Window interface with the desktop host bridge
 */
declare global {
  interface Window {
    pixivflowHost?: HostLoginBridge;
  }
}

export {};
