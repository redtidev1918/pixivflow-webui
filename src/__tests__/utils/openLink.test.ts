/**
 * Tests for opening links.
 *
 * The two intents are not interchangeable: a browser tab can open a link, but
 * only a host can show it *inside the app*. These assert that the difference
 * survives instead of being papered over with a new tab.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('../../utils/hostCapabilities', () => ({
  getHostCapabilities: jest.fn(() => ({})),
  // Derived from the same probe, exactly as the real module derives it.
  canOpenUrl: jest.fn(() => typeof (getHostCapabilities() as { openUrl?: unknown }).openUrl === 'function'),
}));

import { getHostCapabilities } from '../../utils/hostCapabilities';
import { openLink, openLinkInApp, canOpenLinkInApp } from '../../utils/openLink';

const mockedGetHostCapabilities = getHostCapabilities as jest.MockedFunction<
  typeof getHostCapabilities
>;

describe('openLink — the user should look at this page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetHostCapabilities.mockReturnValue({});
  });

  it('asks the host to open the default browser when it can', async () => {
    const openExternal = jest.fn(async () => undefined);
    mockedGetHostCapabilities.mockReturnValue({ openExternal });
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await openLink('https://www.pixiv.net/artworks/1');

    expect(openExternal).toHaveBeenCalledWith('https://www.pixiv.net/artworks/1');
    expect(click).not.toHaveBeenCalled();
    click.mockRestore();
  });

  it('opens a new tab when there is no host', async () => {
    const opened: Array<{ href: string; target: string; rel: string }> = [];
    const click = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        opened.push({ href: this.href, target: this.target, rel: this.rel });
      });

    await openLink('https://www.pixiv.net/artworks/1');

    expect(opened).toEqual([
      {
        href: 'https://www.pixiv.net/artworks/1',
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    ]);
    // The helper must not leave its anchor behind in the DOM.
    expect(document.querySelectorAll('a[target="_blank"]')).toHaveLength(0);
    click.mockRestore();
  });

  it('refuses a non-http(s) URL without reaching the host', async () => {
    const openExternal = jest.fn(async () => undefined);
    mockedGetHostCapabilities.mockReturnValue({ openExternal });

    await expect(openLink('javascript:alert(1)')).rejects.toThrow(/non-http\(s\)/);
    await expect(openLink('file:///etc/passwd')).rejects.toThrow(/non-http\(s\)/);
    expect(openExternal).not.toHaveBeenCalled();
  });

  it('refuses a string that is not a URL at all', async () => {
    await expect(openLink('not a url')).rejects.toThrow(/Not a valid URL/);
  });
});

describe('openLinkInApp — show it inside the app', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetHostCapabilities.mockReturnValue({});
  });

  it('uses the host window when the host provides one', async () => {
    const openUrl = jest.fn(async () => undefined);
    mockedGetHostCapabilities.mockReturnValue({ openUrl });

    await openLinkInApp('https://example.com/settings');

    expect(openUrl).toHaveBeenCalledWith('https://example.com/settings');
    expect(canOpenLinkInApp()).toBe(true);
  });

  it('fails honestly in a browser instead of pretending a tab is the app', async () => {
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await expect(openLinkInApp('https://example.com/settings')).rejects.toThrow(
      /cannot open a link inside the app/
    );
    expect(click).not.toHaveBeenCalled();
    click.mockRestore();
  });

  it('still refuses a non-http(s) URL', async () => {
    mockedGetHostCapabilities.mockReturnValue({ openUrl: jest.fn(async () => undefined) });

    await expect(openLinkInApp('javascript:alert(1)')).rejects.toThrow(/non-http\(s\)/);
  });
});
