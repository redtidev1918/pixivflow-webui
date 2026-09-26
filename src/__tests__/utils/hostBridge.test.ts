/**
 * Tests for the desktop-host login bridge detection helper.
 *
 * These deliberately do NOT mock `src/utils/hostBridge`: they assert the real
 * capability probe against `window.pixivflowHost`, because getting it wrong is
 * how the page would fall back to a visible system browser inside a desktop
 * app that can show the authorization page itself.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { HostLoginBridge } from '../../types/host-bridge';

// Keep the real module: no jest.mock('../../utils/hostBridge') in this file.
import { getHostLoginBridge, hasInAppLoginWindow } from '../../utils/hostBridge';

describe('hostBridge — capability detection', () => {
  beforeEach(() => {
    delete (window as { pixivflowHost?: unknown }).pixivflowHost;
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

  it('ignores an Electron-shaped bridge this repository no longer supports', () => {
    // The desktop host is Tauri (WKWebView / WebView2), never Electron. A
    // stale `window.electron` from an abandoned shell must not be mistaken for
    // a login path: nothing in the product writes it any more.
    (window as { electron?: unknown }).electron = {
      openLoginWindow: jest.fn(async () => ({ success: true })),
    };

    expect(getHostLoginBridge()).toBeNull();
    expect(hasInAppLoginWindow()).toBe(false);

    delete (window as { electron?: unknown }).electron;
  });
});
