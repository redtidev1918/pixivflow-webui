import { useState } from 'react';
import { Button } from 'antd';
import { FolderOpenOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { usePathActions } from '../../hooks/usePathActions';

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
  /**
   * Disable with an explanation when there is nothing to reveal yet (for
   * example a download folder the page only knows about after a config load).
   */
  disabledReason?: string;
}

/**
 * "Show this in my file manager", with the hostless answer already handled.
 *
 * Every place that reveals a download goes through here so the three answers
 * are reported identically:
 *
 *  - `revealed` — the folder is on screen;
 *  - `copied`   — this machine cannot show it (Docker, a NAS, a VPS, or a
 *    path that is not on this machine), so the path went to the clipboard;
 *  - `failed`   — the path could not be resolved, so there is nothing to copy
 *    either.
 *
 * On a machine with no desktop host the button is only useful as "open the
 * download folder" — copy the path is the server user's primary action, which
 * is why it lives beside this one as its own button rather than being hidden
 * inside this one.
 */
export function RevealPathButton({
  filePath,
  fileType,
  label,
  size = 'small',
  variant = 'link',
  disabled,
  disabledReason,
}: RevealPathButtonProps) {
  const { t } = useTranslation();
  const { reveal } = usePathActions();
  const [loading, setLoading] = useState(false);

  const text = label ?? t('files.openFolder');

  const handleClick = async () => {
    setLoading(true);
    try {
      await reveal({ filePath, type: fileType });
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
      title={disabled ? disabledReason : undefined}
      onClick={handleClick}
      aria-label={text}
    >
      {text}
    </Button>
  );
}
