import { Form, Tabs } from 'antd';
import type { FormInstance } from 'antd';
import { useConfigTabItems } from './hooks/useConfigTabItems';
import type { ConfigFormValues } from '../hooks';

interface ConfigTabsProps {
  form: FormInstance<ConfigFormValues>;
  activeTab: string;
  onTabChange: (key: string) => void;
  onTargetChange: () => void | Promise<void>;
}

/**
 * ConfigTabs component - Tab navigation for the configuration sections
 */
export function ConfigTabs({
  form,
  activeTab,
  onTabChange,
  onTargetChange,
}: ConfigTabsProps) {
  const { tabItems } = useConfigTabItems({ form, onTargetChange });

  return (
    <Form form={form} layout="vertical">
      <Tabs
        activeKey={activeTab}
        onChange={onTabChange}
        items={tabItems}
        /* Seven settings tabs can wrap onto a second row instead of scrolling
           off the right edge; the animated ink bar assumes a single row. */
        animated={false}
        tabBarGutter={24}
      />
    </Form>
  );
}
