import { useState } from 'react';
import { Button, message } from 'antd';
import { FolderOpenOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { revealInFileManager } from '../../utils/revealPath';

export interface OpenDirectoryButtonProps {
  /** Which download directory to open. */
  directoryType: 'illustration' | 'novel';
  /**
   * A downloaded file to show. Its *parent* directory is revealed, which is
   * what "show in Finder/Explorer" means everywhere else. Omit to open the
   * download directory itself.
   */
  filePath?: string;
  /** Label override; defaults to `files.openDirectory`. */
  label?: string;
  size?: 'small' | 'middle' | 'large';
  /** Ant Design button variant; `link` fits table rows and inline hints. */
  variant?: 'link' | 'text' | 'default';
  disabled?: boolean;
}

/**
 * "Show this in the system file manager" as one button.
 *
 * Every place that opens a download folder goes through here so the three
 * possible answers are handled identically:
 *
 *  - `opened`  — the folder is on screen (the desktop host, or a local backend);
 *  - `copied`  — this environment has no file manager (a container, a headless
 *    server), so the path went to the clipboard instead;
 *  - `missing` — the download folder has not been created yet;
 *  - `failed`  — nothing could be done, and the folder may simply not exist yet.
 */
export function OpenDirectoryButton({
  directoryType,
  filePath,
  label,
  size = 'small',
  variant = 'link',
  disabled,
}: OpenDirectoryButtonProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const result = await revealInFileManager({ filePath, type: directoryType });

      if (result.outcome === 'opened') {
        message.success(t('reveal.opened', { path: result.path ?? '' }));
        return;
      }
      if (result.outcome === 'copied') {
        message.info(t('reveal.copied', { path: result.path ?? '' }));
        return;
      }
      if (result.outcome === 'missing') {
        message.info(t('reveal.missing'));
        return;
      }
      message.error(t('reveal.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type={variant}
      size={size}
      icon={<FolderOpenOutlined />}
      loading={loading}
      disabled={disabled}
      onClick={handleClick}
      aria-label={label ?? t('files.openDirectory')}
    >
      {label ?? t('files.openDirectory')}
    </Button>
  );
}
