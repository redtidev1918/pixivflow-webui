import { Alert, Button, Space } from 'antd';
import { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface LoginRequiredAlertProps {
  /** Optional retry callback (re-runs the failed query). */
  onRetry?: () => void;
  style?: CSSProperties;
}

/**
 * User-facing replacement for the raw backend configuration error shown when
 * the app has no Pixiv session yet: it explains the situation in plain
 * language and offers the one action that fixes it.
 */
export default function LoginRequiredAlert({ onRetry, style }: LoginRequiredAlertProps) {
  const { t } = useTranslation();

  return (
    <Alert
      type="warning"
      showIcon
      style={style}
      message={t('auth.requiredTitle')}
      description={
        <Space direction="vertical" size={8}>
          <span>{t('auth.requiredDesc')}</span>
          <Space wrap>
            <Link to="/login">
              <Button type="primary" size="small">
                {t('auth.loginAction')}
              </Button>
            </Link>
            {onRetry ? (
              <Button size="small" onClick={onRetry}>
                {t('auth.retryAction')}
              </Button>
            ) : null}
          </Space>
        </Space>
      }
    />
  );
}
