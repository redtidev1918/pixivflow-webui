import { Steps } from 'antd';
import { SafetyOutlined, ThunderboltOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

interface LoginStepsProps {
  current: number;
}

/**
 * Login steps indicator component
 */
export function LoginSteps({ current }: LoginStepsProps) {
  const { t } = useTranslation();
  return (
    <Steps
      current={current}
      size="small"
      items={[
        { title: t('login.stepMode'), icon: <SafetyOutlined /> },
        { title: t('login.stepAuth'), icon: <ThunderboltOutlined /> },
        { title: t('login.stepDone'), icon: <CheckCircleOutlined /> },
      ]}
      style={{ marginBottom: 8 }}
    />
  );
}

