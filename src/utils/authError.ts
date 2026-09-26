import { ApiError, handleApiError } from '../services/api';

/**
 * Error codes that mean "there is no usable Pixiv session yet".
 *
 * These are configuration-validation failures rather than real faults: the
 * backend cannot talk to Pixiv until somebody signs in, so the UI must guide
 * the user to the sign-in page instead of showing a raw backend message.
 */
const AUTH_REQUIRED_CODES = new Set([
  'PIXIV_AUTH_REQUIRED',
  'CONFIG_VALIDATION_PIXIV_REQUIRED',
  'CONFIG_VALIDATION_PIXIV_CLIENT_ID_REQUIRED',
  'CONFIG_VALIDATION_PIXIV_REFRESH_TOKEN_REQUIRED',
]);

/**
 * Legacy/raw message shapes still emitted by older backends or by generic
 * handler codes, e.g. `pixiv.refreshToken: No valid refresh token found.
 * Please login to authenticate.`
 */
const AUTH_REQUIRED_MESSAGE_PATTERNS: RegExp[] = [
  /no valid refresh token/i,
  /please login to authenticate/i,
  /需要\s*登录/,
  /请先登录/,
];

/** True when the error code itself identifies a missing Pixiv session. */
export function isAuthRequiredCode(code?: string): boolean {
  return !!code && AUTH_REQUIRED_CODES.has(code);
}

/**
 * Fragments that mark a backend message as terminal-oriented rather than
 * user-facing (the CLI prints them verbatim; a browser must not).
 */
const CLI_GUIDANCE_PATTERNS: RegExp[] = [
  /💡/,
  /Configuration validation failed/i,
  /pixivflow login/i,
  /Run one of the following commands/i,
];

/**
 * Returns a short, browser-safe version of a raw backend message, or
 * `undefined` when the message is terminal-oriented or empty.
 */
export function sanitizeBackendMessage(message?: string): string | undefined {
  if (!message) {
    return undefined;
  }
  if (CLI_GUIDANCE_PATTERNS.some((pattern) => pattern.test(message))) {
    return undefined;
  }
  return message.length > 300 ? `${message.slice(0, 300)}…` : message;
}

/**
 * True when an API error means the user must sign in with Pixiv before this
 * page can work — either through the error code or through a backend message
 * that still carries the raw configuration-validation wording.
 */
export function isAuthRequiredError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  const apiError: ApiError = error instanceof ApiError ? error : handleApiError(error);
  if (isAuthRequiredCode(apiError.code)) {
    return true;
  }

  const message = typeof apiError.message === 'string' ? apiError.message : '';
  if (!message) {
    return false;
  }

  return AUTH_REQUIRED_MESSAGE_PATTERNS.some((pattern) => pattern.test(message));
}
