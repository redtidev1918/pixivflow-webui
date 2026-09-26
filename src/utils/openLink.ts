import { canOpenUrl, getHostCapabilities } from './hostCapabilities';

/**
 * Send the user to a link, using whichever shape of the page this is.
 *
 * Two different intents, because they are not the same promise:
 *
 *  - `openLink(url)` — "the user should look at this page". A desktop host is
 *    asked to open the user's **default browser**, which is where they expect a
 *    link to land; a browser tab just opens it.
 *  - `openLinkInApp(url)` — "this page should be shown **inside the app**". Only
 *    a host can promise that, so without one it fails honestly instead of
 *    throwing the user out to a browser and calling it the same thing.
 *
 * A link never comes from free-form input: these helpers take URLs the product
 * itself renders, and they refuse any scheme that is not `http(s)` so a stray
 * `javascript:` can never reach the OS or a new tab.
 */

/** Whether a URL can be shown in a window the host owns. */
export function canOpenLinkInApp(): boolean {
  return canOpenUrl();
}

function assertHttpUrl(url: string): void {
  let protocol: string;
  try {
    protocol = new URL(url).protocol;
  } catch {
    throw new Error(`Not a valid URL: ${url}`);
  }
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new Error(`Refusing to open a non-http(s) URL: ${url}`);
  }
}

/** Hand the URL to the browser this page runs in, in a new tab. */
function openInBrowser(url: string): void {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

/**
 * Open a URL in the user's browser — the default browser when the page runs in
 * a desktop host, a new tab otherwise.
 *
 * @param url - Absolute `http(s)` URL to open.
 */
export async function openLink(url: string): Promise<void> {
  assertHttpUrl(url);

  const openExternal = getHostCapabilities().openExternal;
  if (openExternal) {
    return openExternal(url);
  }

  openInBrowser(url);
}

/**
 * Open a URL inside the desktop host's own window.
 *
 * Rejects when this runtime has no host: a browser tab cannot open something
 * "inside the app", and pretending otherwise would be a lie about where the
 * user is going.
 *
 * @param url - Absolute `http(s)` URL to open in the host.
 */
export async function openLinkInApp(url: string): Promise<void> {
  assertHttpUrl(url);

  const openUrl = getHostCapabilities().openUrl;
  if (!openUrl) {
    throw new Error('This environment cannot open a link inside the app');
  }

  return openUrl(url);
}
