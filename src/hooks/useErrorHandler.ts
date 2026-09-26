import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { message } from 'antd';
import { ApiError, handleApiError } from '../services/api';
import { translateErrorCode } from '../utils/errorCodeTranslator';
import { isAuthRequiredError, sanitizeBackendMessage } from '../utils/authError';

/**
 * Hook for unified error handling
 */
export function useErrorHandler() {
  const { t } = useTranslation();

  const resolveErrorMessage = useCallback(
    (apiError: ApiError, customMessage?: string) => {
      if (customMessage) {
        return customMessage;
      }

      // A missing Pixiv session is not a failure to explain in backend terms.
      if (isAuthRequiredError(apiError)) {
        return t('auth.requiredTitle');
      }

      // Never show terminal-oriented backend text (CLI login guidance) in the UI.
      const backendMessage = sanitizeBackendMessage(apiError.message);
      const translatedMessage = translateErrorCode(apiError.code, t, apiError.params, backendMessage);

      if (translatedMessage) {
        return translatedMessage;
      }

      return backendMessage || t('common.error');
    },
    [t]
  );

  const handleError = useCallback(
    (error: unknown, customMessage?: string) => {
      const apiError = error instanceof ApiError ? error : handleApiError(error);
      const errorMessage = resolveErrorMessage(apiError, customMessage);

      message.error(errorMessage);

      if (process.env.NODE_ENV !== 'production') {
        console.error('[PixivFlow] API Error:', apiError);
      }

      return apiError;
    },
    [resolveErrorMessage]
  );

  const handleSuccess = useCallback((msg: string) => {
    message.success(msg);
  }, []);

  const handleWarning = useCallback((msg: string) => {
    message.warning(msg);
  }, []);

  const handleInfo = useCallback((msg: string) => {
    message.info(msg);
  }, []);

  return {
    handleError,
    handleSuccess,
    handleWarning,
    handleInfo,
  };
}

