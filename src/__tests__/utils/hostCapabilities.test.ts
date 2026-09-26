/**
 * Tests for the host capability layer.
 *
 * These deliberately do NOT mock `src/utils/hostCapabilities`: they assert the
 * real probe against `window.pixivflowHost`, because this module is where "what
 * can this machine do for the page?" is decided — and getting it wrong is how
 * the UI would promise a Finder window on a Docker or NAS deployment.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { HostLoginBridge } from '../../types/host-bridge';

// Keep the real module: no jest.mock('../../utils/hostCapabilities') here.
import {
  getHostCapabilities,
  canRevealPath,
} from '../../utils/hostCapabilities';

/** A host bridge as the desktop injects it: login always, capabilities by version. */
function hostWith(capabilities: Partial<HostLoginBridge>): HostLoginBridge {
  return {
    openLoginWindow: jest.fn(async () => ({ code: null })),
    ...capabilities,
  } as unknown as HostLoginBridge;
}

describe('hostCapabilities — what this runtime can do', () => {
  beforeEach(() => {
    delete (window as { pixivflowHost?: unknown }).pixivflowHost;
  });

  it('reports no capabilities without a host (Docker, NAS, VPS, plain browser)', () => {
    expect(getHostCapabilities()).toBeNull();
    expect(canRevealPath()).toBe(false);
  });

  it('reports no capabilities for a host that only provides login', () => {
    window.pixivflowHost = hostWith({});

    expect(getHostCapabilities()).toBeNull();
    expect(canRevealPath()).toBe(false);
  });

  it('exposes revealPath when the installed host shipped it', async () => {
    const revealPath = jest.fn(async () => undefined);
    window.pixivflowHost = hostWith({ revealPath });

    const capabilities = getHostCapabilities();

    expect(canRevealPath()).toBe(true);
    await capabilities?.revealPath('/downloads/a.jpg');
    expect(revealPath).toHaveBeenCalledWith('/downloads/a.jpg');
  });

  it('ignores a revealPath that is present but not callable', () => {
    window.pixivflowHost = hostWith({
      revealPath: 'nope' as unknown as HostLoginBridge['revealPath'],
    });

    expect(getHostCapabilities()).toBeNull();
    expect(canRevealPath()).toBe(false);
  });
});
