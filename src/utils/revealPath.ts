import { filesApi } from '../services/api/files';
import { copyToClipboard, getHostCapabilities } from './hostCapabilities';

/**
 * Device-facing actions on a downloaded path.
 *
 * The two actions answer the two shapes of this page, and neither of them can
 * be performed by the backend:
 *
 *  - **reveal** — "Show in Finder": only a desktop host knows the user's
 *    screen, so the backend only says *where* the file is
 *    (`GET /api/files/location`) and the host shows it. `browser -> remote
 *    backend -> xdg-open` is meaningless on a server and lies to the user about
 *    which machine opens.
 *  - **copy** — the honest answer for a Docker, NAS, VPS or Fly.io deployment:
 *    there is nothing local to open, and the path is exactly what the user needs
 *    in order to fetch the file themselves.
 *
 * Both start by asking the backend to resolve and confine the path, so what the
 * host is handed — and what lands on the clipboard — is always an absolute path
 * inside a configured download directory, never a raw string from a history row.
 */

/** What actually happened, so the UI can say it without inventing a reason. */
export type RevealOutcome = 'revealed' | 'copied' | 'failed';

/**
 * Why the path was copied instead of shown:
 *  - `no-host` — this machine runs no desktop host (plain browser/server);
 *  - `missing` — the host exists, but the path is not on this machine yet
 *    (a fresh install, or the backend runs somewhere else).
 */
export type RevealReason = 'no-host' | 'missing';

/** The outcome of showing a path in the file manager. */
export interface RevealResult {
  outcome: RevealOutcome;
  /** The backend-resolved path, when it could be resolved. */
  path?: string;
  /** Why the path went to the clipboard instead of the screen. */
  reason?: RevealReason;
  /** The error that made this fail, for logging and tests. */
  error?: unknown;
}

/** The outcome of copying a path. */
export interface CopyResult {
  outcome: 'copied' | 'failed';
  /** The backend-resolved path, when it could be resolved. */
  path?: string;
  /**
   * `unavailable` — the path could not be resolved, or this browser gave the
   * page no clipboard (an insecure origin, or a denied permission).
   */
  reason?: 'unavailable';
  error?: unknown;
}

export interface PathOptions {
  /**
   * A downloaded file or directory, as recorded by the backend. A directory is
   * revealed/selected itself; a file is selected *inside* its parent folder.
   * Omit to target the download directory itself.
   */
  filePath?: string;
  /** Which download directory to fall back to; defaults to illustrations. */
  type?: 'illustration' | 'novel';
}

function errorMessageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Ask the backend where this path really is.
 *
 * Returns `undefined` when the backend could not resolve it — an unknown file,
 * or a legacy row pointing outside the configured download directory.
 */
async function resolveLocation(options: PathOptions): Promise<string | undefined> {
  try {
    const response = await filesApi.getFileLocation({
      path: options.filePath,
      type: options.type,
    });
    return response.data?.path;
  } catch {
    return undefined;
  }
}

/**
 * Put a downloaded path on the clipboard.
 *
 * This is the answer for every server shape, and a deliberate success — not a
 * quiet degradation of "open folder". The path is resolved first so the user
 * pastes an absolute path they can actually use.
 */
export async function copyPath(options: PathOptions = {}): Promise<CopyResult> {
  const path = await resolveLocation(options);
  if (!path) {
    // Without a resolved path there is nothing honest to put on the clipboard;
    // copying the raw argument would paste something that does not exist.
    return {
      outcome: 'failed',
      reason: 'unavailable',
      error: new Error(
        `Could not resolve a downloaded path for ${options.filePath ?? options.type ?? 'the download directory'}`
      ),
    };
  }

  return copyResolvedPath(path);
}

/** Put an already-resolved path on the clipboard (no second backend round trip). */
async function copyResolvedPath(path: string): Promise<CopyResult> {
  try {
    await copyToClipboard(path);
    return { outcome: 'copied', path };
  } catch (error) {
    return { outcome: 'failed', path, reason: 'unavailable', error };
  }
}

/**
 * Show a downloaded path in this machine's file manager.
 *
 * The host does the showing; when there is no host, or the path is not on this
 * machine, the path goes to the clipboard instead of reporting a failure the
 * user cannot act on.
 */
export async function revealInFileManager(options: PathOptions = {}): Promise<RevealResult> {
  const path = await resolveLocation(options);
  if (!path) {
    return {
      outcome: 'failed',
      error: new Error(
        `Could not resolve a downloaded path for ${options.filePath ?? options.type ?? 'the download directory'}`
      ),
    };
  }

  const revealPath = getHostCapabilities()?.revealPath;
  if (!revealPath) {
    return copyOrFail(path, 'no-host');
  }

  try {
    await revealPath(path);
    return { outcome: 'revealed', path };
  } catch (error) {
    // The host refusing means the path is not on this machine, which is the
    // same situation as having no host: the clipboard is the useful answer.
    return copyOrFail(path, 'missing', error);
  }
}

/**
 * Fall back to the clipboard and report it truthfully.
 *
 * Used when showing is impossible, so the outcome is a *copy* — never a
 * "revealed" that did not happen, and never an error that hides a working path.
 */
async function copyOrFail(
  path: string,
  reason: RevealReason,
  error?: unknown
): Promise<RevealResult> {
  const result = await copyResolvedPath(path);
  if (result.outcome === 'copied') {
    return { outcome: 'copied', path, reason };
  }
  return {
    outcome: 'failed',
    path,
    error: error ?? result.error ?? new Error('Clipboard is not available'),
  };
}

/** Exposed for diagnostics and tests: the message behind a failure. */
export const describePathError = errorMessageOf;
