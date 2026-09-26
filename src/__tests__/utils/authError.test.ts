import { ApiError } from '../../services/api';
import {
  isAuthRequiredCode,
  isAuthRequiredError,
  sanitizeBackendMessage,
} from '../../utils/authError';

describe('authError', () => {
  describe('isAuthRequiredCode', () => {
    it('recognises the pixiv configuration-validation codes', () => {
      expect(isAuthRequiredCode('CONFIG_VALIDATION_PIXIV_REQUIRED')).toBe(true);
      expect(isAuthRequiredCode('CONFIG_VALIDATION_PIXIV_CLIENT_ID_REQUIRED')).toBe(true);
      expect(isAuthRequiredCode('CONFIG_VALIDATION_PIXIV_REFRESH_TOKEN_REQUIRED')).toBe(true);
      expect(isAuthRequiredCode('PIXIV_AUTH_REQUIRED')).toBe(true);
    });

    it('ignores unrelated or missing codes', () => {
      expect(isAuthRequiredCode('SCHEDULER_LIST_FAILED')).toBe(false);
      expect(isAuthRequiredCode('CONFIG_VALIDATION_TARGETS_REQUIRED')).toBe(false);
      expect(isAuthRequiredCode(undefined)).toBe(false);
      expect(isAuthRequiredCode('')).toBe(false);
    });
  });

  describe('isAuthRequiredError', () => {
    it('detects the code on an ApiError', () => {
      const error = new ApiError('CONFIG_VALIDATION_PIXIV_REFRESH_TOKEN_REQUIRED', 'config', 500);
      expect(isAuthRequiredError(error)).toBe(true);
    });

    it('detects the legacy raw backend message without a specific code', () => {
      const error = new ApiError(
        'SCHEDULER_LIST_FAILED',
        'pixiv.refreshToken: No valid refresh token found. Please login to authenticate.',
        500
      );
      expect(isAuthRequiredError(error)).toBe(true);
    });

    it('detects the raw message on a plain Error', () => {
      expect(
        isAuthRequiredError(new Error('pixiv.refreshToken: No valid refresh token found.'))
      ).toBe(true);
    });

    it('leaves genuine failures alone', () => {
      expect(isAuthRequiredError(new ApiError('SCHEDULER_LIST_FAILED', 'database not configured', 500))).toBe(
        false
      );
      expect(isAuthRequiredError(new Error('Request failed with status code 502'))).toBe(false);
      expect(isAuthRequiredError(undefined)).toBe(false);
      expect(isAuthRequiredError(null)).toBe(false);
    });
  });

  describe('sanitizeBackendMessage', () => {
    it('drops terminal-oriented backend text', () => {
      expect(sanitizeBackendMessage('Configuration validation failed in /tmp/c.json:\n💡 You need to login first.')).toBeUndefined();
      expect(sanitizeBackendMessage('Run one of the following commands: pixivflow login')).toBeUndefined();
      expect(sanitizeBackendMessage('')).toBeUndefined();
      expect(sanitizeBackendMessage(undefined)).toBeUndefined();
    });

    it('keeps a short, human-readable message', () => {
      expect(sanitizeBackendMessage('database not configured')).toBe('database not configured');
    });

    it('truncates an over-long message', () => {
      const sanitized = sanitizeBackendMessage('x'.repeat(1000));
      expect(sanitized).toBeDefined();
      expect(sanitized!.length).toBe(301);
      expect(sanitized!.endsWith('…')).toBe(true);
    });
  });
});
