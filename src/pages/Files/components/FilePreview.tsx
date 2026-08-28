import { useEffect, useState } from 'react';
import { Button, Space } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { PreviewModal } from '../../../components/modals/PreviewModal';
import { useFilePreview } from '../../../hooks/useFiles';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';

const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
const textExtensions = ['.txt', '.md', '.text'];

export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  downloadedAt?: string | null;
  extension?: string;
}

export interface FilePreviewProps {
  visible: boolean;
  file: FileItem | null;
  fileType: 'illustration' | 'novel';
  onClose: () => void;
  /** All previewable files in the current listing — enables prev/next. */
  files?: FileItem[];
  /** Called when the user navigates to another file. */
  onNavigate?: (file: FileItem) => void;
}

/**
 * File preview component. When a file list is provided, adds prev/next
 * navigation (buttons + arrow keys) so the user can flip through the
 * folder's items without closing the preview.
 */
export function FilePreview({
  visible,
  file,
  fileType,
  onClose,
  files = [],
  onNavigate,
}: FilePreviewProps) {
  const { t } = useTranslation();
  const [textContent, setTextContent] = useState<string>('');

  const ext = file?.extension?.toLowerCase() || '';
  const isImage = imageExtensions.includes(ext);
  const isText = textExtensions.includes(ext);

  const { previewUrl, isLoading: isLoadingPreview } = useFilePreview(
    isImage ? file?.path : undefined,
    fileType
  );

  const currentIndex = file ? files.findIndex((f) => f.path === file.path) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < files.length - 1;

  // Arrow-key navigation while the preview is open
  useEffect(() => {
    if (!visible || !onNavigate || !file) return;
    const handler = (event: KeyboardEvent) => {
      const prev = hasPrev ? files[currentIndex - 1] : undefined;
      const next = hasNext ? files[currentIndex + 1] : undefined;
      if (event.key === 'ArrowLeft' && prev) {
        onNavigate(prev);
      } else if (event.key === 'ArrowRight' && next) {
        onNavigate(next);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, file, files, currentIndex, hasPrev, hasNext, onNavigate]);

  // Load text content for text files
  useEffect(() => {
    if (visible && file && isText) {
      const loadTextContent = async () => {
        try {
          const url = `/api/files/preview?path=${encodeURIComponent(file.path)}&type=${fileType}`;
          const response = await fetch(url);
          if (response.ok) {
            setTextContent(await response.text());
          } else {
            message.error(t('files.loadContentFailed'));
            onClose();
          }
        } catch {
          message.error(t('files.loadContentFailed'));
          onClose();
        }
      };
      loadTextContent();
    } else if (!visible) {
      setTextContent('');
    }
  }, [visible, file, isText, fileType, t, onClose]);

  if (!file) return null;

  // Determine preview type
  let previewType: 'image' | 'text' | 'custom' = 'custom';
  if (isImage) {
    previewType = 'image';
  } else if (isText) {
    previewType = 'text';
  }

  const navigateButton = (direction: 'prev' | 'next') => {
    const targetIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= files.length || !onNavigate) return null;
    const target = files[targetIndex];
    if (!target) return null;
    return (
      <Button
        icon={direction === 'prev' ? <LeftOutlined /> : <RightOutlined />}
        onClick={() => onNavigate(target)}
      />
    );
  };

  const navBar =
    files.length > 1 && currentIndex >= 0 ? (
      <Space align="center" style={{ display: 'flex', justifyContent: 'center' }}>
        {navigateButton('prev')}
        <span style={{ color: '#6b7280' }}>
          {currentIndex + 1} / {files.length}
        </span>
        {navigateButton('next')}
      </Space>
    ) : null;

  return (
    <PreviewModal
      open={visible}
      title={file.name}
      type={previewType}
      imageUrl={isImage ? previewUrl || undefined : undefined}
      content={isText ? textContent : undefined}
      loading={isLoadingPreview || (isText && !textContent && visible)}
      onCancel={onClose}
      width={800}
      showFooter={false}
      renderContent={
        navBar
          ? () => (
              <div>
                {previewType === 'image' ? (
                  <img
                    src={previewUrl || undefined}
                    alt={file.name}
                    style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }}
                  />
                ) : previewType === 'text' ? (
                  <div
                    style={{
                      maxHeight: '60vh',
                      overflow: 'auto',
                      padding: '16px',
                      background: '#f5f5f5',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {textContent}
                  </div>
                ) : (
                  <div>{file.name}</div>
                )}
                <div style={{ marginTop: '12px' }}>{navBar}</div>
              </div>
            )
          : undefined
      }
    />
  );
}
