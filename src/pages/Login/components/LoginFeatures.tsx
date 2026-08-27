import { Space, Typography } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

/**
 * Login features showcase component
 */
export function LoginFeatures() {
  const { t } = useTranslation();
  return (
    <div style={{
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      padding: '16px',
      borderRadius: '12px',
      marginBottom: 8,
    }}>
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
          <Text style={{ fontSize: '13px' }}>{t('login.featureSecure')}</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
          <Text style={{ fontSize: '13px' }}>{t('login.featureSave')}</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
          <Text style={{ fontSize: '13px' }}>{t('login.featureMulti')}</Text>
        </div>
      </Space>
    </div>
  );
}

