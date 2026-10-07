import { useCallback } from 'react';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  copyPath,
  revealInFileManager,
  type CopyResult,
  type PathOptions,
  type RevealResult,
} from '../utils/revealPath';

/**
 * Tell the user what happened to a path, in one voice.
 *
 * The same two actions are triggered from the files table, the download history
 * and the download page, so a copy that succeeded must never look like a
 * failure in one of them. Every call site shares this reporting instead of
 * re-deriving a message from the outcome.
 */
export function usePathActions() {
  const { t } = useTranslation();

  const reportReveal = useCallback(
    (result: RevealResult) => {
      const path = result.path ?? '';

      if (result.outcome === 'revealed') {
        message.success(t('reveal.opened', { path }));
        return;
      }
      if (result.outcome === 'copied') {
        message.info(
          result.reason === 'missing'
            ? t('reveal.missingPath', { path })
            : t('reveal.copied', { path })
        );
        return;
      }
      message.error(t('reveal.failed'));
    },
    [t]
  );

  const reportCopy = useCallback(
    (result: CopyResult) => {
      const path = result.path ?? '';

      if (result.outcome === 'copied') {
        message.success(t('reveal.copiedPath', { path }));
        return;
      }
      message.error(t('reveal.copyFailed'));
    },
    [t]
  );

  /** Show a downloaded path in this machine's file manager, or copy it. */
  const reveal = useCallback(
    async (options: PathOptions = {}) => {
      const result = await revealInFileManager(options);
      reportReveal(result);
      return result;
    },
    [reportReveal]
  );

  /** Put a downloaded path on the clipboard, wherever this page is running. */
  const copy = useCallback(
    async (options: PathOptions = {}) => {
      const result = await copyPath(options);
      reportCopy(result);
      return result;
    },
    [reportCopy]
  );

  return { reveal, copy };
}
