import { Form, Input, Button, Alert } from 'antd';
import { LoginOutlined, ReloadOutlined, KeyOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

interface LoginFormProps {
  loginMode: 'interactive' | 'token';
  isLoggingIn: boolean;
  isLoggingInWithToken: boolean;
  onLogin: (values?: { refreshToken?: string }) => void;
  onCheckStatus?: () => void;
}

/**
 * Login form component
 */
export function LoginForm({ 
  loginMode, 
  isLoggingIn, 
  isLoggingInWithToken,
  onLogin,
  onCheckStatus,
}: LoginFormProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const isLoading = isLoggingIn || isLoggingInWithToken;

  const handleSubmit = () => {
    if (loginMode === 'token') {
      form.validateFields(['refreshToken']).then(() => {
        const values = form.getFieldsValue();
        onLogin(values);
      }).catch(() => {
        // Validation failed
      });
    } else {
      onLogin();
    }
  };

  return (
    <Form
      form={form}
      name="login"
      onFinish={handleSubmit}
      layout="vertical"
      size="large"
      autoComplete="off"
    >
      {loginMode === 'token' && (
        <Form.Item
          name="refreshToken"
          label={
            <span style={{ fontSize: '14px', fontWeight: 500 }}>
              <KeyOutlined style={{ marginRight: 8 }} /> Refresh Token
            </span>
          }
          rules={[
            { required: true, message: t('login.tokenRequired') },
            { min: 10, message: t('login.tokenInvalid') },
          ]}
        >
          <Input.TextArea
            placeholder={t('login.tokenPlaceholder')}
            autoSize={{ minRows: 3, maxRows: 6 }}
            style={{ fontSize: '14px', fontFamily: 'monospace' }}
          />
        </Form.Item>
      )}

      <Form.Item style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          htmlType="button"
          block
          icon={<LoginOutlined />}
          loading={isLoading}
          size="large"
          onClick={handleSubmit}
          style={{
            height: '48px',
            fontSize: '16px',
            fontWeight: 600,
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
          }}
        >
          {isLoading ? t('login.loggingIn') : t('login.loginButton')}
        </Button>
      </Form.Item>

      {isLoading && (
        <Alert
          message={
            <span style={{ fontWeight: 600 }}>
              {t('login.processing')}
            </span>
          }
          description={
            <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
              {loginMode === 'interactive' ? (
                <div>
                  <div style={{ marginBottom: 12, color: 'rgba(0, 0, 0, 0.65)' }}>
                    {t('login.processingInteractiveDesc')}
                  </div>
                  {onCheckStatus && (
                    <div style={{ 
                      padding: '12px', 
                      background: 'rgba(24, 144, 255, 0.08)', 
                      borderRadius: '8px',
                      borderLeft: '3px solid #1890ff',
                      marginTop: 12,
                    }}>
                      <div style={{ marginBottom: 10, color: 'rgba(0, 0, 0, 0.65)' }}>
                        <strong style={{ color: '#1890ff' }}>{t('login.tipLabel')}</strong>{t('login.checkStatusHint')}
                      </div>
                      <Button
                        type="primary"
                        size="small"
                        icon={<ReloadOutlined />}
                        onClick={onCheckStatus}
                        style={{ 
                          width: '100%',
                          height: '32px',
                          borderRadius: '6px',
                        }}
                      >
                        {t('login.checkStatus')}
                      </Button>
                    </div>
                  )}
                </div>
              ) : loginMode === 'token' ? (
                <div style={{ color: 'rgba(0, 0, 0, 0.65)' }}>
                  {t('login.verifying')}
                </div>
              ) : null}
            </div>
          }
          type="info"
          showIcon
          style={{ 
            marginTop: 0,
            borderRadius: '8px',
          }}
        />
      )}
    </Form>
  );
}

