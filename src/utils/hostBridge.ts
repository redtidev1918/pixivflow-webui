import type { ElectronAPI } from '../types/electron';
import type { HostLoginBridge } from '../types/host-bridge';
import { getElectronAPI, getHostBridge } from './hostBridgeAccess';

/**
 * Either in-app login window provider:
 * - `pixivflowHost`: injected by a desktop host (e.g. the Tauri webview app).
 *   `openLoginWindow(authUrl, redirectUri)` resolves the authorization `code`
 *   (or `null` when the user closed the window), so the new host login flow
 *   drives it directly.
 * - `electron`: injected by the external Electron shell. It opens a system
 *   browser window and delivers the result through IPC events
 *   (`onLoginSuccess` / `onLoginError`), so the hook keeps handling it through
 *   its existing Electron branch.
 */
export type InAppLoginBridge = HostLoginBridge | ElectronAPI;

/**
 * Get the active host login bridge, if the page runs inside a desktop host
 * that injects `window.pixivflowHost`.
 */
export function getHostLoginBridge(): HostLoginBridge | null {
  return getHostBridge();
}

/**
 * Get the Electron login bridge, if the page runs inside the Electron shell.
 */
export function getElectronLoginBridge(): ElectronAPI | null {
  return getElectronAPI();
}

/**
 * Get any desktop host that can show the login window inside the app:
 * `window.pixivflowHost` first, then the Electron bridge.
 */
export function getInAppLoginBridge(): InAppLoginBridge | null {
  return getHostLoginBridge() ?? getElectronLoginBridge();
}

/**
 * Whether an in-app login window is available in this runtime.
 */
export function hasInAppLoginWindow(): boolean {
  return getInAppLoginBridge() !== null;
}
