import { Typography, Space, Select, Tag, Tooltip } from 'antd';
import { FolderOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { ConfigFileInfo } from '../../../services/api';
import { api } from '../../../services/api';
import { useErrorHandler } from '../../../hooks/useErrorHandler';
import { QUERY_KEYS } from '../../../constants';

const { Text } = Typography;

type MaybePromise<T = void> = T | Promise<T>;

interface ConfigHeaderProps {
  currentConfigPath: string;
  configFiles: ConfigFileInfo[];
  onConfigFileSwitch: () => MaybePromise;
  refetchConfigFiles: () => MaybePromise<unknown>;
}

/** Last path segment, so a long absolute path never becomes the headline. */
function baseName(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts.length > 0 ? String(parts[parts.length - 1]) : path;
}

/** Everything above the file name; empty when the path has no directory part. */
function directoryOf(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts.length > 1 ? parts.slice(0, -1).join('/') : '';
}

/**
 * The active configuration, stated in human terms.
 *
 * A newcomer should be able to answer "which file am I editing, and where does
 * it live?" without decoding a relative path, so the file name is the
 * headline, the directory sits underneath, and switching files is one control
 * on the same line rather than a second selector elsewhere on the page.
 */
export function ConfigHeader({
  currentConfigPath,
  configFiles,
  onConfigFileSwitch,
  refetchConfigFiles,
}: ConfigHeaderProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useErrorHandler();
  const activeConfigFile = configFiles?.find((f) => f.isActive);
  const activeName = activeConfigFile?.filename ?? baseName(currentConfigPath);
  const directory = activeConfigFile?.pathRelative
    ? directoryOf(activeConfigFile.pathRelative)
    : directoryOf(currentConfigPath);

  const handleConfigFileChange = async (filename: string) => {
    const file = configFiles.find((f) => f.filename === filename);
    if (file && !file.isActive) {
      try {
        await api.switchConfigFile(file.path);
        handleSuccess(t('config.configSwitched'));
        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONFIG });
        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONFIG_FILES });
        await Promise.resolve(refetchConfigFiles());
        await Promise.resolve(onConfigFileSwitch());
      } catch (error) {
        handleError(error, t('config.configSwitchFailed'));
      }
    }
  };

  return (
    <div className="config-active" style={{ flex: '1 1 auto', minWidth: 220 }}>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {t('config.activeConfigLabel')}
      </Text>
      <Tooltip title={currentConfigPath}>
        <div className="config-active-name">{activeName}</div>
      </Tooltip>
      {directory ? (
        <Text type="secondary" style={{ fontSize: 12 }} className="text-ellipsis">
          <FolderOutlined style={{ marginRight: 4 }} />
          {t('config.configDirectory')}: {directory}
        </Text>
      ) : null}
      {configFiles && configFiles.length > 1 && (
        <Space size={8} style={{ marginTop: 8 }} wrap>
          <Select
            value={activeConfigFile?.filename || undefined}
            onChange={handleConfigFileChange}
            style={{ width: 280 }}
            placeholder={t('config.selectConfigFile')}
            size="small"
            aria-label={t('config.selectConfigFile')}
          >
            {configFiles.map((file) => (
              <Select.Option key={file.filename} value={file.filename}>
                {file.isActive && (
                  <Tag color="green" style={{ marginRight: 8 }}>
                    {t('config.activeConfig')}
                  </Tag>
                )}
                {file.filename}
              </Select.Option>
            ))}
          </Select>
        </Space>
      )}
    </div>
  );
}
