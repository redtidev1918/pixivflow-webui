import { filesApi } from '../services/api/files';
import { getHostCapabilities } from './hostCapabilities';

/**
 * "Show this downloaded work in my file manager" — the whole decision in one
 * place, and it only ever involves two parties:
 *
 *  1. the **backend** answers *where* the file is (`GET /api/files/location`).
 *     It resolves and confines the path to a configured download directory and
 *     never opens anything: for a container, a NAS or a VPS the backend is not
 *     on the machine the user is looking at, and `browser -> xdg-open` there
 *     would be a lie.
 *  2. the **host** — a desktop app the page runs inside — shows that path
 *     locally. Only the host knows the device in front of the user.
 *
 * When there is no host (a plain browser against a server), the path is copied
 * to the clipboard instead. That is not a failure: on Docker, NAS, Fly.io or a
 * VPS the path is genuinely the useful thing to hand over, which is why the
 * copy fallback is never hidden.
 */

export type RevealOutcome = 'revealed' | 'copied' | 'failed';

/** Why the path ended up on the clipboard rather than on screen. */
export type RevealReason = 'no-host' | 'missing';

export interface RevealResult {
  outcome: RevealOutcome;
  /** Absolute path, as the backend resolved it. */
  path?: string;
  /** Present when the path was copied instead of shown. */
  reason?: RevealReason;
  /** Underlying error, when the path could not even be resolved. */
  error?: unknown;
}

export interface RevealOptions {
  /** File to show; omit to reveal the download directory itself. */
  filePath?: string;
  /** Which download directory the file lives in. */
  type?: 'illustration' | 'novel';
}

/**
 * The `GET /files/location` answer is a flat handler shape
 * (`{ success, path, directory, exists, isDirectory }`), like the other file
 * handlers, so it is read through its own type.
 */
interface LocationEnvelope {
  path?: string;
  exists?: boolean;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Hand the path over as text — the only answer a hostless environment has. */
async function copyResult(
  path: string,
  reason: RevealReason
): Promise<RevealResult> {
  const copied = await copyToClipboard(path);
  return copied
    ? { outcome: 'copied', path, reason }
    : { outcome: 'failed', path };
}

/** Copy the path, or report the reason the *showing* attempt failed. */
async function copyOrFail(
  path: string,
  reason: RevealReason,
  error?: unknown
): Promise<RevealResult> {
  const copied = await copyResult(path, reason);
  return copied.outcome === 'copied' ? copied : { outcome: 'failed', path, error };
}

/**
 * Show a downloaded file — or the download directory itself — in this
 * machine's file manager, copying the path when this machine cannot.
 */
export async function revealInFileManager(
  options: RevealOptions = {}
): Promise<RevealResult> {
  // 1. The backend says where the file is. It never opens anything, and a file
  //    that has since been deleted still answers, because its path is exactly
  //    what the user wants to copy.
  let resolved: LocationEnvelope;
  try {
    const response = await filesApi.getFileLocation({
      path: options.filePath,
      type: options.type,
    });
    resolved = response.data as unknown as LocationEnvelope;
  } catch (error) {
    return { outcome: 'failed', error };
  }

  const path = resolved?.path;
  if (!path) {
    // Nothing resolved, so there is nothing to show and nothing to copy.
    return { outcome: 'failed' };
  }

  // A download directory that does not exist yet is not a defect — it is the
  // truth on a fresh install, and the path is still worth pasting.
  if (resolved.exists === false) {
    return copyOrFail(path, 'missing');
  }

  // 2. This machine shows it, if it can.
  const revealPath = getHostCapabilities()?.revealPath;
  if (typeof revealPath === 'function') {
    try {
      await revealPath(path);
      return { outcome: 'revealed', path };
    } catch (error) {
      // The host refused the path it was handed — it is not on this machine
      // (the backend may be remote). Copying is the honest answer.
      return copyOrFail(path, 'missing', error);
    }
  }

  // 3. No host: a browser against a server. Copy it and say why.
  return copyOrFail(path, 'no-host');
}
