import { useMemo } from 'react';
import type { FormInstance } from 'antd';
import type { TabsProps } from 'antd';
import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { BasicConfigForm } from '../BasicConfigForm';
import { NetworkConfigForm } from '../NetworkConfigForm';
import { StorageConfigForm } from '../StorageConfigForm';
import { SchedulerConfigForm } from '../SchedulerConfigForm';
import { DownloadConfigForm } from '../DownloadConfigForm';
import { TargetsConfigForm } from '../TargetsConfigForm';
import type { ConfigFormValues } from '../../hooks';

const { Text } = Typography;

interface UseConfigTabItemsParams {
  form: FormInstance<ConfigFormValues>;
  onTargetChange: () => void | Promise<void>;
}

/**
 * The sections that edit configuration values.
 *
 * One tab per question a user can actually ask ("which account?", "how many
 * downloads?", "through a proxy?"), ordered from "required to start" to "only
 * if you need it". File management and history deliberately do not live here:
 * they are reached from the header and the "files and history" section, so the
 * tab row stays a list of settings rather than a list of everything.
 */
export function useConfigTabItems({ form, onTargetChange }: UseConfigTabItemsParams) {
  const { t } = useTranslation();

  const pixivChildren = useMemo(
    () => (
      <div>
        <Text type="secondary">{t('config.pixivCredentialsHidden')}</Text>
      </div>
    ),
    [t],
  );

  const tabItems = useMemo<TabsProps['items']>(
    () => [
      {
        key: 'pixiv',
        label: t('config.tabPixiv'),
        children: pixivChildren,
      },
      {
        key: 'basic',
        label: t('config.tabBasic'),
        children: <BasicConfigForm />,
      },
      {
        key: 'download',
        label: t('config.tabDownload'),
        children: <DownloadConfigForm />,
      },
      {
        key: 'storage',
        label: t('config.tabStorage'),
        children: <StorageConfigForm />,
      },
      {
        key: 'network',
        label: t('config.tabNetwork'),
        children: <NetworkConfigForm />,
      },
      {
        key: 'scheduler',
        label: t('config.tabScheduler'),
        children: <SchedulerConfigForm />,
      },
      {
        key: 'targets',
        label: t('config.tabTargets'),
        children: <TargetsConfigForm form={form} onTargetChange={onTargetChange} />,
      },
    ],
    [form, onTargetChange, pixivChildren, t],
  );

  return { tabItems };
}
