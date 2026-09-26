import React from 'react';
import { Card, Button, Space, Alert, Typography, Tooltip } from 'antd';
import {
  PlayCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../hooks/useAuth';
import { RevealPathButton, CopyPathButton } from '../../../components/common';
import type { DownloadDirectories } from '../hooks';

const { Text } = Typography;

interface TaskActionsProps {
  hasActiveTask: boolean;
  onStartClick: () => void;
  onRunAllClick: () => void;
  onStopClick: () => void;
  isStarting: boolean;
  isRunningAll: boolean;
  isStopping: boolean;
  /**
   * The download directories the backend resolved (absolute paths), so the
   * page can show where files really land instead of the relative value typed
   * into the config file.
   */
  directories?: DownloadDirectories;
  onRefreshConfig?: () => void;
}

export const TaskActions: React.FC<TaskActionsProps> = ({
  hasActiveTask,
  onStartClick,
  onRunAllClick,
  onStopClick,
  isStarting,
  isRunningAll,
  isStopping,
  directories,
  onRefreshConfig,
}) => {
  const { t } = useTranslation();
  const { authenticated } = useAuth();
  
  // Buttons that require authentication
  const requiresAuth = !authenticated;
  const loginTip = t('common.loginRequired');
  const notCreatedYet = t('download.pathNotCreatedYet');

  return (
    <Card
      title={
        <Space>
          <InfoCircleOutlined />
          <span>{t('download.taskOperations')}</span>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      <Space wrap>
        <Tooltip title={requiresAuth ? loginTip : undefined}>
          <Button
            type="primary"
            size="large"
            icon={<PlayCircleOutlined />}
            onClick={onStartClick}
            disabled={hasActiveTask || requiresAuth}
            loading={isStarting}
          >
            {t('download.startDownload')}
          </Button>
        </Tooltip>
        <Tooltip title={requiresAuth ? loginTip : undefined}>
          <Button
            size="large"
            icon={<ReloadOutlined />}
            onClick={onRunAllClick}
            disabled={hasActiveTask || requiresAuth}
            loading={isRunningAll}
          >
            {t('download.downloadAll')}
          </Button>
        </Tooltip>
        <Button
          danger
          size="large"
          icon={<StopOutlined />}
          onClick={onStopClick}
          disabled={!hasActiveTask}
          loading={isStopping}
        >
          {t('download.stopCurrent')}
        </Button>
      </Space>
      {hasActiveTask && (
        <Alert
          message={t('download.hasActiveTask')}
          description={t('download.hasActiveTaskDesc')}
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
      {directories && (
        <Alert
          message={
            <Space>
              <span>{t('download.fileSavePath')}</span>
              {onRefreshConfig && (
                <Button
                  type="text"
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={onRefreshConfig}
                  title={t('download.refreshPath')}
                />
              )}
            </Space>
          }
          description={
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <DirectoryRow
                label={t('download.illustrationPath')}
                directory={directories.illustration}
                fileType="illustration"
                notCreatedYet={notCreatedYet}
              />
              <DirectoryRow
                label={t('download.novelPath')}
                directory={directories.novel}
                fileType="novel"
                notCreatedYet={notCreatedYet}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {t('download.pathTip')}
              </Text>
            </Space>
          }
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </Card>
  );
};

/**
 * One download directory with the two actions that make sense on it.
 *
 * Both buttons are always rendered: on a server "copy path" *is* the way to
 * reach the file, so hiding it behind a failed "open folder" attempt would
 * deprive the users who need it most. The actions are disabled only when there
 * is nothing real to act on yet.
 */
const DirectoryRow: React.FC<{
  label: string;
  directory?: { path: string; exists: boolean };
  fileType: 'illustration' | 'novel';
  notCreatedYet: string;
}> = ({ label, directory, fileType, notCreatedYet }) => {
  const { t } = useTranslation();
  const unavailable = !directory || !directory.exists;

  return (
    <Text>
      <Text strong>{label}</Text>
      {directory?.path ?? '-'}
      <RevealPathButton
        filePath={directory?.path}
        fileType={fileType}
        disabled={unavailable}
        disabledReason={notCreatedYet}
        label={t('reveal.openDownloadDir')}
      />
      <CopyPathButton
        filePath={directory?.path}
        fileType={fileType}
        disabled={unavailable}
        disabledReason={notCreatedYet}
      />
    </Text>
  );
};

