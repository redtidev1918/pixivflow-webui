/**
 * Tests for the desktop-host login bridge detection helper.
 *
 * These deliberately do NOT mock `src/utils/hostBridge`: they assert the real
 * capability probe against `window.pixivflowHost`.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { ElectronAPI } from '../../types/electron';
import type { HostLoginBridge } from '../../types/host-bridge';

// Keep the real module: no jest.mock('../../utils/hostBridge') in this file.
import {
  getHostLoginBridge,
  getElectronLoginBridge,
  getInAppLoginBridge,
  hasInAppLoginWindow,
} from '../../utils/hostBridge';

describe('hostBridge — capability detection', () => {
  beforeEach(() => {
    delete (window as { pixivflowHost?: unknown }).pixivflowHost;
    delete (window as { electron?: unknown }).electron;
  });

  it('detects the host bridge when window.pixivflowHost.openLoginWindow exists', () => {
    const openLoginWindow = jest.fn(async () => ({ code: 'abc' }));
    window.pixivflowHost = { openLoginWindow } as unknown as HostLoginBridge;

    const bridge = getHostLoginBridge();

    expect(bridge).not.toBeNull();
    expect(bridge?.openLoginWindow).toBe(openLoginWindow);
    expect(hasInAppLoginWindow()).toBe(true);
  });

  it('returns null when pixivflowHost is absent or not a usable bridge', () => {
    expect(getHostLoginBridge()).toBeNull();

    // Present but not callable -> not a bridge.
    window.pixivflowHost = {} as unknown as HostLoginBridge;
    expect(getHostLoginBridge()).toBeNull();
    expect(hasInAppLoginWindow()).toBe(false);
  });

  it('keeps the Electron bridge as a separate fallback', () => {
    const electron = {
      openLoginWindow: jest.fn(async () => ({ success: true })),
    } as unknown as ElectronAPI;
    window.electron = electron;

    expect(getHostLoginBridge()).toBeNull();
    expect(getElectronLoginBridge()).toBe(electron);
    expect(getInAppLoginBridge()).toBe(electron);
    expect(hasInAppLoginWindow()).toBe(true);
  });

  it('prefers the host bridge over Electron when both are present', () => {
    const host = { openLoginWindow: jest.fn() } as unknown as HostLoginBridge;
    const electron = {
      openLoginWindow: jest.fn(async () => ({ success: true })),
    } as unknown as ElectronAPI;
    window.pixivflowHost = host;
    window.electron = electron;

    expect(getInAppLoginBridge()).toBe(host);
  });
});
