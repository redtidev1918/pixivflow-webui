import type { ElectronAPI } from '../types/electron';
import type { HostLoginBridge } from '../types/host-bridge';

/**
 * Raw accessors for the bridges a desktop host may inject.
 *
 * This module only *finds* a bridge and must stay dependency-free: the
 * capability layer (`hostCapabilities.ts`) and the login helpers
 * (`hostBridge.ts`) both build on it, and a shared leaf module is what keeps
 * them from importing each other.
 */

/**
 * Get `window.pixivflowHost`, the bridge a desktop host (e.g. the Tauri app)
 * injects. Only `openLoginWindow` is required for the bridge to count as
 * present — every other member is an optional capability the page must probe
 * before using.
 */
export function getHostBridge(): HostLoginBridge | null {
  if (
    typeof window !== 'undefined' &&
    typeof window.pixivflowHost?.openLoginWindow === 'function'
  ) {
    return window.pixivflowHost;
  }

  return null;
}

/**
 * Get the Electron bridge, injected by the external Electron shell.
 */
export function getElectronAPI(): ElectronAPI | null {
  if (
    typeof window !== 'undefined' &&
    typeof window.electron?.openLoginWindow === 'function'
  ) {
    return window.electron;
  }

  return null;
}
