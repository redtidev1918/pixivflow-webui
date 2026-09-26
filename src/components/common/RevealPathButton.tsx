import { useState } from 'react';
import { Button, message } from 'antd';
import { FolderOpenOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { revealInFileManager } from '../../utils/revealPath';

export interface RevealPathButtonProps {
  /**
   * A downloaded file to show. It is selected *inside* its folder, which is
   * what "Show in Finder/Explorer" means everywhere else. Omit to reveal the
   * download directory itself.
   */
  filePath?: string;
  /** Which download directory the file lives in; defaults to illustrations. */
  fileType?: 'illustration' | 'novel';
  /** Label override; defaults to `files.openFolder`. */
  label?: string;
  size?: 'small' | 'middle' | 'large';
  /** Ant Design button variant; `link` fits table rows and inline hints. */
  variant?: 'link' | 'text' | 'default';
  disabled?: boolean;
}

/**
 * "Show this in my file manager", with the hostless answer already handled.
 *
 * Every place that reveals a download goes through here so the three answers
 * are reported identically:
 *
 *  - `revealed` — the folder is on screen;
 *  - `copied`   — this machine cannot show it (Docker, a NAS, a VPS, or a
 *    folder that does not exist yet), so the path went to the clipboard;
 *  - `failed`   — the path could not be resolved, so there is nothing to copy
 *    either.
 */
export function RevealPathButton({
  filePath,
  fileType,
  label,
  size = 'small',
  variant = 'link',
  disabled,
}: RevealPathButtonProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const result = await revealInFileManager({ filePath, type: fileType });

      if (result.outcome === 'revealed') {
        message.success(t('reveal.opened', { path: result.path ?? '' }));
        return;
      }
      if (result.outcome === 'copied') {
        message.info(
          result.reason === 'missing'
            ? t('reveal.missingPath', { path: result.path ?? '' })
            : t('reveal.copied', { path: result.path ?? '' })
        );
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
      aria-label={label ?? t('files.openFolder')}
    >
      {label ?? t('files.openFolder')}
    </Button>
  );
}
