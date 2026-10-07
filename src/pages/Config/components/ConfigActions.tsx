import { Button, Space, Tooltip, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import {
  SaveOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  UploadOutlined,
  FileTextOutlined,
  CopyOutlined,
  EditOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../hooks/useAuth';

interface ConfigActionsProps {
  onRefresh: () => void;
  onPreview: () => void;
  onExport: () => void;
  onImport: () => void;
  onCopy: () => void | Promise<void>;
  onValidate: () => void;
  onSave: () => void;
  /** Opens the raw JSON editor for the active file, when one is known. */
  onEditJson?: () => void;
  isValidating: boolean;
  isUpdating: boolean;
  isImporting?: boolean;
}

/**
 * Actions that apply to the whole configuration file.
 *
 * Only "save" changes the running configuration, so only "save" is a primary
 * button; validation and the file-shaped operations (preview, export, import,
 * copy) live behind one menu. Seven equally weighted buttons at the top of the
 * page made a newcomer read all of them before doing anything.
 */
export function ConfigActions({
  onExport,
  onImport,
  onCopy,
  onValidate,
  onSave,
  onEditJson,
  isValidating,
  isUpdating,
  isImporting = false,
  onPreview,
}: ConfigActionsProps) {
  const { t } = useTranslation();
  const { authenticated } = useAuth();

  const requiresAuth = !authenticated;
  const loginTip = t('common.loginRequired');

  const menuItems: MenuProps['items'] = [
    {
      key: 'preview',
      icon: <FileTextOutlined />,
      label: t('config.previewConfig'),
    },
    { type: 'divider' },
    {
      key: 'export',
      icon: <DownloadOutlined />,
      label: t('config.exportConfig'),
    },
    {
      key: 'copy',
      icon: <CopyOutlined />,
      label: t('config.copyConfig'),
    },
    {
      key: 'import',
      icon: <UploadOutlined />,
      label: t('config.importConfig'),
      disabled: isImporting || requiresAuth,
    },
    ...(onEditJson
      ? [
          { type: 'divider' as const },
          {
            key: 'edit-json',
            icon: <EditOutlined />,
            label: t('config.editJson'),
          },
        ]
      : []),
  ];

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    switch (key) {
      case 'preview':
        onPreview();
        break;
      case 'export':
        onExport();
        break;
      case 'copy':
        void onCopy();
        break;
      case 'import':
        onImport();
        break;
      case 'edit-json':
        onEditJson?.();
        break;
      default:
        break;
    }
  };

  return (
    <Space wrap>
      <Button
        icon={<CheckCircleOutlined />}
        onClick={onValidate}
        loading={isValidating}
        disabled={isValidating}
      >
        {t('config.validateConfig')}
      </Button>
      <Dropdown
        menu={{ items: menuItems, onClick: handleMenuClick }}
        trigger={['click']}
        placement="bottomRight"
      >
        <Button icon={<MoreOutlined />} aria-label={t('config.moreActions')}>
          {t('config.moreActions')}
        </Button>
      </Dropdown>
      <Tooltip title={requiresAuth ? loginTip : undefined}>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={onSave}
          loading={isUpdating}
          disabled={requiresAuth}
        >
          {t('config.saveConfig')}
        </Button>
      </Tooltip>
    </Space>
  );
}
