import { filesApi } from '../services/api/files';
import { getHostLoginBridge } from './hostBridge';

/**
 * "Show in the system file manager" — one place that knows the whole decision.
 *
 * Two hosts can open a folder, and they are not equivalent:
 *
 *  - the **desktop host** (`window.pixivflowHost.openDirectory`) opens a window
 *    on the machine the user is actually looking at. It is preferred.
 *  - the **backend** (`POST /api/files/reveal`) opens the folder on the machine
 *    the backend runs on. For a local install that is the same machine, but for
 *    a server or a container it is not — the backend answers
 *    `FILE_REVEAL_UNSUPPORTED` there rather than pretending to succeed.
 *
 * The path is always resolved by the backend first (`resolveOnly`), so the
 * desktop host only ever opens a directory the backend has confined to a
 * configured download directory. When neither side can open one, the path is
 * copied to the clipboard and the caller is told: a path the user can paste is
 * a better answer than a silent no-op.
 *
 * A download directory that does not exist yet is its own outcome (`missing`),
 * not a failure: on a fresh install it is simply the truth, and "cannot open"
 * would blame the user for the app having nothing to show.
 */

export type RevealOutcome = 'opened' | 'copied' | 'missing' | 'failed';

export interface RevealResult {
  outcome: RevealOutcome;
  /** Directory that was opened, or the path handed to the clipboard. */
  path?: string;
  /** Underlying error, when `outcome === 'failed'`. */
  error?: unknown;
}

/**
 * The reveal endpoint answers in the flat file-handler shape
 * (`{ success, errorCode, path }`), like `DELETE /api/files/:id`, so it is read
 * through its own type rather than the generic `ApiResponse<T>` envelope.
 */
interface RevealEnvelope {
  success?: boolean;
  errorCode?: string;
  path?: string;
  exists?: boolean;
}

const REVEAL_UNSUPPORTED = 'FILE_REVEAL_UNSUPPORTED';

/**
 * Read the backend error code out of a rejected request.
 *
 * The response interceptor (`src/services/api/error-handler.ts`) turns every
 * failure into an `ApiError` whose `code` is the backend `errorCode`; a raw
 * axios error still carries it under `response.data`. Both are read so the
 * answer does not depend on which layer rejected.
 */
function errorCodeOf(error: unknown): string | undefined {
  const typed = error as {
    code?: unknown;
    response?: { data?: { errorCode?: unknown } };
  };
  const direct = typed?.code;
  if (typeof direct === 'string') return direct;
  const code = typed?.response?.data?.errorCode;
  return typeof code === 'string' ? code : undefined;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

async function copyFallback(path: string): Promise<RevealResult> {
  const copied = await copyToClipboard(path);
  return copied ? { outcome: 'copied', path } : { outcome: 'failed', path };
}

/**
 * Reveal the download directory — or, when `filePath` is given, the parent
 * directory of that file.
 *
 * @param options.filePath - A downloaded file to show; omit to show the download directory.
 * @param options.type - Which download directory the file lives in.
 */
export async function revealInFileManager(options: {
  filePath?: string;
  type?: 'illustration' | 'novel';
}): Promise<RevealResult> {
  let resolvedPath: string | undefined;

  // 1. Ask the backend what directory this is, without opening anything.
  try {
    const response = await filesApi.revealFile({
      path: options.filePath,
      type: options.type,
      resolveOnly: true,
    });
    const body = response.data as unknown as RevealEnvelope;
    resolvedPath = body?.path;
    // A directory that has not been created yet: nothing to open, nothing broken.
    if (body?.exists === false) {
      return { outcome: 'missing', path: resolvedPath };
    }
  } catch (error) {
    return { outcome: 'failed', error };
  }

  if (!resolvedPath) {
    return { outcome: 'failed' };
  }

  // 2. The desktop host opens it locally.
  const hostBridge = getHostLoginBridge();
  if (hostBridge && typeof hostBridge.openDirectory === 'function') {
    try {
      await hostBridge.openDirectory(resolvedPath);
      return { outcome: 'opened', path: resolvedPath };
    } catch {
      // Fall through: the backend may still be able to open it.
    }
  }

  // 3. The backend opens it (a local install has a file manager too).
  try {
    const response = await filesApi.revealFile({
      path: options.filePath,
      type: options.type,
    });
    const body = response.data as unknown as RevealEnvelope;
    if (body?.errorCode === REVEAL_UNSUPPORTED) {
      return copyFallback(resolvedPath);
    }
    return { outcome: 'opened', path: body?.path ?? resolvedPath };
  } catch (error) {
    if (errorCodeOf(error) === REVEAL_UNSUPPORTED) {
      return copyFallback(resolvedPath);
    }
    return { outcome: 'failed', error, path: resolvedPath };
  }
}
