/**
 * Desktop host bridge type definitions
 *
 * The desktop host (e.g. the Tauri app wrapping this WebUI in a webview) may
 * inject `window.pixivflowHost` so the interactive login can be completed in an
 * in-app window instead of the backend launching a system browser.
 *
 * This is only a capability declaration: the UI never talks to Pixiv itself and
 * never receives tokens from the host — it forwards the authorization code to
 * the backend, which performs the OAuth token exchange.
 */
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
   * UI copies the path instead. Probe it through
   * `getHostCapabilities().revealPath` rather than calling it directly.
   *
   * @param path - Absolute path to reveal.
   * @returns Resolves once the file manager was asked to show it; rejects when
   *   the path is not on this machine or the OS refused.
   */
  revealPath?(path: string): Promise<void>;

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
