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
