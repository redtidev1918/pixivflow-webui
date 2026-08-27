import { Empty, EmptyProps } from 'antd';
import i18n from '../../i18n/config';

interface EmptyStateProps extends EmptyProps {
  description?: string;
  action?: React.ReactNode;
}

/**
 * Component for displaying empty state
 */
export function EmptyState({ description, action, ...props }: EmptyStateProps) {
  return (
    <Empty
      description={description || i18n.t('common.noData')}
      {...props}
    >
      {action}
    </Empty>
  );
}

