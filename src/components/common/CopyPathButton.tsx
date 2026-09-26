import { useState } from 'react';
import { Button } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { usePathActions } from '../../hooks/usePathActions';

export interface CopyPathButtonProps {
  /**
   * The downloaded file or directory to copy the path of. Omit to copy the
   * download directory itself.
   */
  filePath?: string;
  /** Which download directory to resolve against; defaults to illustrations. */
  fileType?: 'illustration' | 'novel';
  /** Label override; defaults to `reveal.copyPath`. */
  label?: string;
  size?: 'small' | 'middle' | 'large';
  /** Ant Design button variant; `link` fits table rows and inline hints. */
  variant?: 'link' | 'text' | 'default';
  disabled?: boolean;
  disabledReason?: string;
}

/**
 * "Copy this path" — the primary action on a server, not a fallback.
 *
 * Docker, NAS, VPS and Fly.io users cannot open a folder on their own machine
 * from a remote backend, and the path is exactly what they need in order to
 * fetch the file. So this is its own button everywhere a file is listed, not a
 * hidden branch of the "open folder" one.
 *
 * The path copied is the backend-resolved absolute path
 * (`GET /api/files/location`), never the raw string from a history row: rows
 * written by older versions can still hold a relative path.
 */
export function CopyPathButton({
  filePath,
  fileType,
  label,
  size = 'small',
  variant = 'link',
  disabled,
  disabledReason,
}: CopyPathButtonProps) {
  const { t } = useTranslation();
  const { copy } = usePathActions();
  const [loading, setLoading] = useState(false);

  const text = label ?? t('reveal.copyPath');

  const handleClick = async () => {
    setLoading(true);
    try {
      await copy({ filePath, type: fileType });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type={variant}
      size={size}
      icon={<CopyOutlined />}
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
