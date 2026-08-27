import { Form, Radio, Alert } from 'antd';
import { SafetyOutlined, KeyOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

interface LoginModeSelectorProps {
  value: 'interactive' | 'token';
  onChange: (mode: 'interactive' | 'token') => void;
  onResetFields: () => void;
}

/**
 * Login mode selector component
 */
export function LoginModeSelector({ value, onChange, onResetFields }: LoginModeSelectorProps) {
  const { t } = useTranslation();

  return (
    <>
      <Form.Item
        label={
          <span style={{ fontSize: '15px', fontWeight: 600 }}>
            {t('login.loginMode')}
          </span>
        }
        style={{ marginBottom: 20 }}
      >
        <Radio.Group
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setTimeout(() => {
              onResetFields();
            }, 0);
          }}
          buttonStyle="solid"
          style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: '8px' }}
        >
          <Radio.Button 
            value="interactive" 
            style={{ 
              flex: 1, 
              minWidth: '120px',
              textAlign: 'center',
              height: '48px',
              lineHeight: '48px',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            <SafetyOutlined /> {t('login.loginModeInteractive')}
          </Radio.Button>
          <Radio.Button 
            value="token" 
            style={{ 
              flex: 1, 
              minWidth: '120px',
              textAlign: 'center',
              height: '48px',
              lineHeight: '48px',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            <KeyOutlined /> {t('login.loginModeToken')}
          </Radio.Button>
        </Radio.Group>
      </Form.Item>

      {value === 'interactive' && (
        <Alert
          message={
            <span style={{ fontWeight: 600 }}>
              {t('login.loginModeInteractive')}
            </span>
          }
          description={
            <div style={{ fontSize: '13px' }}>
              <div style={{ marginBottom: 8 }}>{t('login.loginModeInteractiveDesc')}</div>
              <div style={{ 
                padding: '8px 12px', 
                background: 'rgba(24, 144, 255, 0.1)', 
                borderRadius: '6px',
                borderLeft: '3px solid #1890ff',
              }}>
                {t('login.browserWindowNote')}
              </div>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 20 }}
        />
      )}

      {value === 'token' && (
        <Alert
          message={
            <span style={{ fontWeight: 600 }}>
              {t('login.loginModeToken')}
            </span>
          }
          description={
            <div style={{ fontSize: '13px' }}>
              <div style={{ marginBottom: 8 }}>
                {t('login.loginModeTokenDesc')}
              </div>
              <div style={{ 
                padding: '8px 12px', 
                background: 'rgba(82, 196, 26, 0.1)', 
                borderRadius: '6px',
                borderLeft: '3px solid #52c41a',
              }}>
                <strong>{t('login.loginModeTokenTipLabel')}</strong>{t('login.loginModeTokenTip')}
              </div>
            </div>
          }
          type="success"
          showIcon
          style={{ marginBottom: 20 }}
        />
      )}
    </>
  );
}

