import { useState, useCallback } from 'react';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useErrorHandler } from '../../../hooks/useErrorHandler';
import { revealInFileManager } from '../../../utils/revealPath';
import { FileItem } from '../Files';

const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

/**
 * Hook for managing file operations (preview, reveal, delete)
 */
export function useFileOperations(
  deleteFileAsync: (params: { id: string; path?: string; type?: string }) => Promise<void>,
  fileType: 'illustration' | 'novel',
  onNavigate?: (path: string) => void
) {
  const { t } = useTranslation();
  const { handleError } = useErrorHandler();
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  const handlePreview = useCallback(
    (file: FileItem) => {
      if (file.type === 'directory') {
        onNavigate?.(file.path);
        return;
      }

      const ext = file.extension?.toLowerCase() || '';
      const isImage = imageExtensions.includes(ext);
      const isText = ['.txt', '.md', '.text'].includes(ext);

      if (isImage || isText) {
        setPreviewFile(file);
        setPreviewVisible(true);
      } else {
        message.info(t('files.previewNotSupported'));
      }
    },
    [onNavigate, t]
  );

  const handleDelete = useCallback(
    async (file: FileItem) => {
      try {
        await deleteFileAsync({ id: file.name, path: file.path, type: fileType });
        message.success(t('files.fileDeleted'));
      } catch (error) {
        handleError(error);
      }
    },
    [deleteFileAsync, fileType, handleError, t]
  );

  /**
   * Show a file (or a subdirectory) in this machine's file manager.
   *
   * A directory row reveals itself; a file row is selected inside its parent,
   * which is what "show in Finder/Explorer" means everywhere else. The backend
   * only resolves and confines the path; the host shows it, and a machine
   * without a host (a server, a container, a NAS) gets the path on the
   * clipboard instead.
   */
  const handleReveal = useCallback(
    async (file: FileItem) => {
      const result = await revealInFileManager({
        filePath: file.path,
        type: fileType,
      });
      const path = result.path ?? file.path;

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
    [fileType, t]
  );

  const closePreview = useCallback(() => {
    setPreviewVisible(false);
    setPreviewFile(null);
  }, []);

  return {
    previewVisible,
    previewFile,
    handlePreview,
    handleReveal,
    handleDelete,
    closePreview,
  };
}

