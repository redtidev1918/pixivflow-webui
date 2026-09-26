/**
 * Tests for the host capability layer.
 *
 * These deliberately do NOT mock `src/utils/hostCapabilities`: they assert the
 * real probe against `window.pixivflowHost`, because this module is where "what
 * can this machine do for the page?" is decided — and getting it wrong is how
 * the UI would promise a Finder window on a Docker or NAS deployment.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import type { HostLoginBridge } from '../../types/host-bridge';

// Keep the real module: no jest.mock('../../utils/hostCapabilities') here.
import {
  getHostCapabilities,
  copyToClipboard,
  canRevealPath,
  canOpenUrl,
  canNotify,
  canNotifyNow,
} from '../../utils/hostCapabilities';

/** A host bridge as the desktop injects it: login always, capabilities by version. */
function hostWith(capabilities: Partial<HostLoginBridge>): HostLoginBridge {
  return {
    openLoginWindow: jest.fn(async () => ({ code: null })),
    ...capabilities,
  } as unknown as HostLoginBridge;
}

const globalWithNotification = globalThis as { Notification?: unknown };
const originalNotification = globalWithNotification.Notification;

/** Install a fake browser `Notification`, as a granted-permission browser has. */
function withBrowserNotifications(permission: NotificationPermission = 'granted') {
  const instances: Array<{ title: string; body?: unknown }> = [];
  class FakeNotification {
    static permission: NotificationPermission = permission;
    static requestPermission = jest.fn(async () => permission);
    constructor(
      public title: string,
      options?: { body?: unknown }
    ) {
      instances.push({ title, body: options?.body });
    }
  }
  globalWithNotification.Notification = FakeNotification;
  return { instances, FakeNotification };
}

describe('hostCapabilities — what this runtime can do', () => {
  beforeEach(() => {
    delete (window as { pixivflowHost?: unknown }).pixivflowHost;
  });

  afterEach(() => {
    globalWithNotification.Notification = originalNotification;
  });

  it('reports an empty snapshot without a host (Docker, NAS, VPS, plain browser)', () => {
    // Not "nothing works": the callers own the browser fallbacks. This only
    // says the host contributes nothing.
    expect(getHostCapabilities()).toEqual({});
    expect(canRevealPath()).toBe(false);
    expect(canOpenUrl()).toBe(false);
    expect(canNotify()).toBe(false);
    expect(canNotifyNow()).toBe(false);
  });

  it('exposes only the capabilities the installed host shipped', () => {
    const revealPath = jest.fn(async () => undefined);
    window.pixivflowHost = hostWith({ revealPath });

    const capabilities = getHostCapabilities();

    expect(Object.keys(capabilities)).toEqual(['revealPath']);
    expect(canRevealPath()).toBe(true);
    expect(canOpenUrl()).toBe(false);
  });

  it('exposes revealPath when the installed host shipped it', async () => {
    const revealPath = jest.fn(async () => undefined);
    window.pixivflowHost = hostWith({ revealPath });

    await getHostCapabilities().revealPath?.('/downloads/a.jpg');

    expect(revealPath).toHaveBeenCalledWith('/downloads/a.jpg');
  });

  it('ignores members that are present but not callable', () => {
    // A host could hand over plain data from a JSON config; presence alone is
    // not a capability.
    window.pixivflowHost = hostWith({
      revealPath: 'nope' as unknown as HostLoginBridge['revealPath'],
      notify: 42 as unknown as HostLoginBridge['notify'],
      openExternal: null as unknown as HostLoginBridge['openExternal'],
    });

    expect(getHostCapabilities()).toEqual({});
    expect(canRevealPath()).toBe(false);
  });

  it('keeps `this` bound to the bridge by calling through the raw reference', async () => {
    // The desktop injects the bridge as an object; a host implementation that
    // reads its own state would break if the member were detached.
    const revealPath = jest.fn(function (this: unknown) {
      return Promise.resolve(this as unknown as void);
    });
    const bridge = {
      openLoginWindow: jest.fn(async () => ({ code: null })),
      marker: 'sentinel',
      revealPath,
    } as unknown as HostLoginBridge;
    window.pixivflowHost = bridge;

    await getHostCapabilities().revealPath?.('/downloads/a.jpg');

    expect(revealPath).toHaveBeenCalledWith('/downloads/a.jpg');
    expect(revealPath.mock.instances[0]).toBe(bridge);
  });

  it('forwards notify/openExternal/openUrl/copyText straight to the host', async () => {
    const notify = jest.fn(async () => ({ shown: true } as const));
    const openExternal = jest.fn(async () => undefined);
    const openUrl = jest.fn(async () => undefined);
    const copyText = jest.fn(async () => undefined);
    window.pixivflowHost = hostWith({ notify, openExternal, openUrl, copyText });

    const capabilities = getHostCapabilities();
    await capabilities.notify?.({ title: 'Done', body: 'body' });
    await capabilities.openExternal?.('https://example.com');
    await capabilities.openUrl?.('https://example.com/app');
    await capabilities.copyText?.('text');

    expect(notify).toHaveBeenCalledWith({ title: 'Done', body: 'body' });
    expect(openExternal).toHaveBeenCalledWith('https://example.com');
    expect(openUrl).toHaveBeenCalledWith('https://example.com/app');
    expect(copyText).toHaveBeenCalledWith('text');
    expect(canOpenUrl()).toBe(true);
    expect(canNotifyNow()).toBe(true);
  });
});

describe('copyToClipboard — with or without a host', () => {
  beforeEach(() => {
    delete (window as { pixivflowHost?: unknown }).pixivflowHost;
  });

  it('uses the browser clipboard when the host provides none', async () => {
    const writeText = jest.fn(async () => undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    await copyToClipboard('/downloads/illustrations/a.jpg');

    expect(writeText).toHaveBeenCalledWith('/downloads/illustrations/a.jpg');
  });

  it('prefers the host clipboard over the browser one', async () => {
    const hostCopy = jest.fn(async () => undefined);
    const browserCopy = jest.fn(async () => undefined);
    window.pixivflowHost = hostWith({ copyText: hostCopy });
    Object.assign(navigator, { clipboard: { writeText: browserCopy } });

    await copyToClipboard('picked by the host');

    expect(hostCopy).toHaveBeenCalledWith('picked by the host');
    expect(browserCopy).not.toHaveBeenCalled();
  });

  it('falls back to execCommand when the async clipboard is unavailable', async () => {
    // An insecure origin has no `navigator.clipboard` at all.
    Object.assign(navigator, { clipboard: undefined });
    const execCommand = jest.fn(() => true);
    Object.assign(document, { execCommand });

    await expect(copyToClipboard('legacy path')).resolves.toBeUndefined();

    expect(execCommand).toHaveBeenCalledWith('copy');
    delete (document as { execCommand?: unknown }).execCommand;
  });

  it('rejects when neither channel can copy, instead of pretending', async () => {
    Object.assign(navigator, { clipboard: undefined });
    delete (document as { execCommand?: unknown }).execCommand;

    await expect(copyToClipboard('nowhere to go')).rejects.toThrow(/Clipboard is not available/);
  });
});

describe('canNotify — the honest presence test', () => {
  beforeEach(() => {
    delete (window as { pixivflowHost?: unknown }).pixivflowHost;
  });

  afterEach(() => {
    globalWithNotification.Notification = originalNotification;
  });

  it('is true for a host notification even though no browser channel exists', () => {
    window.pixivflowHost = hostWith({ notify: jest.fn(async () => ({ shown: true } as const)) });

    expect(canNotify()).toBe(true);
    expect(canNotifyNow()).toBe(true);
  });

  it('reports a browser channel as present but not usable until granted', () => {
    withBrowserNotifications('default');

    expect(canNotify()).toBe(true);
    expect(canNotifyNow()).toBe(false);
  });

  it('reports granted browser permission as usable', () => {
    withBrowserNotifications('granted');

    expect(canNotifyNow()).toBe(true);
  });

  it('reports denied browser permission as unusable', () => {
    withBrowserNotifications('denied');

    expect(canNotify()).toBe(true);
    expect(canNotifyNow()).toBe(false);
  });
});
