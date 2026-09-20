import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Button, Space, Alert, Spin, message } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { CodeEditor } from '../../../components/common/CodeEditor';
import { useConfigFiles } from '../../../hooks/useConfig';
import { extractErrorInfo, translateErrorCode } from '../../../utils/errorCodeTranslator';
import { QUERY_KEYS } from '../../../constants';

interface ConfigJsonEditorProps {
  visible: boolean;
  filename: string;
  onClose: () => void;
  onConfigFileSwitch?: () => void;
}

export const ConfigJsonEditor: React.FC<ConfigJsonEditorProps> = ({
  visible,
  filename,
  onClose,
  onConfigFileSwitch,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { configFiles, refetch: refetchConfigFiles } = useConfigFiles();
  const [jsonContent, setJsonContent] = useState<string>('');
  const [jsonEditorLoading, setJsonEditorLoading] = useState(false);
  const [lastReadContent, setLastReadContent] = useState<string>('');
  const [hasExternalChanges, setHasExternalChanges] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const lastReadContentRef = useRef<string>('');
  const jsonContentRef = useRef<string>('');
  const isEditingRef = useRef<boolean>(false);

  const loadFileContent = useCallback(async () => {
    try {
      setJsonEditorLoading(true);
      const response = await api.getConfigFileContent(filename);
      const content = response.data.data.content;
      setJsonContent(content);
      setLastReadContent(content);
      lastReadContentRef.current = content;
      jsonContentRef.current = content;
      setHasExternalChanges(false);
    } catch (error) {
      const { message: errorMessage } = extractErrorInfo(error);
      const errorMsg = error instanceof Error ? error.message : undefined;
      message.error(
        `${t('config.configFileReadFailed')}: ${errorMessage || errorMsg || t('config.unknownError')}`
      );
    } finally {
      setJsonEditorLoading(false);
    }
  }, [filename, t]);

  // Load file content when modal opens
  useEffect(() => {
    if (visible && filename) {
      loadFileContent();
    } else {
      // Reset state when closing
      setJsonContent('');
      setLastReadContent('');
      setHasExternalChanges(false);
      lastReadContentRef.current = '';
      jsonContentRef.current = '';
    }
  }, [visible, filename, loadFileContent]);

  // Poll for external changes (only when not editing)
  useEffect(() => {
    if (!visible || !filename || isEditingRef.current) {
      return;
    }

    let isPolling = true;

    const pollFileContent = async () => {
      // Skip polling if user is editing or modal is closed
      if (!isPolling || !filename || isEditingRef.current) return;

      try {
        const response = await api.getConfigFileContent(filename);
        const newContent = response.data.data.content;
        const currentLastRead = lastReadContentRef.current;
        const currentEditorContent = jsonContentRef.current;
        
        // Only update if content changed and user is not editing
        if (newContent !== currentLastRead && newContent !== currentEditorContent && !isEditingRef.current) {
          setHasExternalChanges(true);
          setLastReadContent(newContent);
          lastReadContentRef.current = newContent;
        } else if (newContent === currentEditorContent) {
          setHasExternalChanges(false);
          setLastReadContent(newContent);
          lastReadContentRef.current = newContent;
        } else if (!isEditingRef.current) {
          setLastReadContent(newContent);
          lastReadContentRef.current = newContent;
        }
      } catch (error) {
        console.warn('Failed to poll config file content:', error);
      }
    };

    // Initial poll
    pollFileContent();
    // Poll every 5 seconds (reduced from 2 seconds) and only when not editing
    const intervalId = setInterval(() => {
      if (!isEditingRef.current) {
        pollFileContent();
      }
    }, 5000);

    return () => {
      isPolling = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [visible, filename, isEditing]);

  // Sync refs
  useEffect(() => {
    lastReadContentRef.current = lastReadContent;
  }, [lastReadContent]);

  useEffect(() => {
    jsonContentRef.current = jsonContent;
  }, [jsonContent]);

  // Sync isEditing ref
  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  const handleRefresh = async () => {
    await loadFileContent();
    message.success(t('config.jsonEditorRefreshed'));
  };

  const handleSave = async () => {
    if (!filename) return;
    
    try {
      setJsonEditorLoading(true);
      
      // Validate JSON first
      try {
        JSON.parse(jsonContent);
      } catch (error) {
        message.error(t('config.jsonFormatError'));
        return;
      }
      
      await api.updateConfigFileContent(filename, jsonContent);
      message.success(t('config.configSaved'));
      
      // Update last read content
      setLastReadContent(jsonContent);
      lastReadContentRef.current = jsonContent;
      jsonContentRef.current = jsonContent;
      setHasExternalChanges(false);
      setIsEditing(false);
      isEditingRef.current = false;
      
      // Refresh config data
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONFIG });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONFIG_FILES });
      refetchConfigFiles();
      
      // If this is the active config, reload the page
      const currentFile = configFiles?.find(
        (f) => f.filename === filename && f.isActive
      );
      if (currentFile) {
        if (onConfigFileSwitch) {
          onConfigFileSwitch();
        } else {
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      } else {
        onClose();
      }
    } catch (error) {
      const { errorCode, message: errorMessage, details } = extractErrorInfo(error);
      if (errorCode === 'CONFIG_INVALID' && details && Array.isArray(details)) {
        const errorMessages = details.map((err: unknown) => {
          if (typeof err === 'object' && err !== null && 'code' in err) {
            const errObj = err as { code: string; params?: Record<string, unknown> };
            return translateErrorCode(errObj.code, t, errObj.params);
          }
          return String(err);
        });
        message.error(`${translateErrorCode(errorCode, t)}: ${errorMessages.join(', ')}`);
      } else {
        message.error(errorMessage || t('config.configSaveFailed'));
      }
    } finally {
      setJsonEditorLoading(false);
    }
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonContent);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonContent(formatted);
      message.success(t('config.jsonFormatted'));
    } catch (error) {
      message.error(t('config.jsonFormatError'));
    }
  };

  return (
    <Modal
      title={
        <Space>
          {t('config.editJson')}
          <span style={{ color: '#999', fontSize: 14 }}>({filename})</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={900}
      footer={[
        <Button key="format" onClick={handleFormat}>
          {t('config.formatJson')}
        </Button>,
        <Button key="cancel" onClick={onClose}>
          {t('common.cancel')}
        </Button>,
        <Button
          key="save"
          type="primary"
          icon={<SaveOutlined />}
          loading={jsonEditorLoading}
          onClick={handleSave}
        >
          {t('config.saveConfig')}
        </Button>,
      ]}
    >
      <Spin spinning={jsonEditorLoading && !jsonContent}>
        {hasExternalChanges && (
          <Alert
            message={t('config.jsonEditorExternalChanges')}
            description={t('config.jsonEditorExternalChangesDesc')}
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            action={
              <Button size="small" onClick={handleRefresh}>
                {t('config.refresh')}
              </Button>
            }
          />
        )}
        <CodeEditor
          value={jsonContent}
          onChange={(value) => {
            setJsonContent(value);
            setIsEditing(true);
            isEditingRef.current = true;
            if (hasExternalChanges && value !== lastReadContent) {
              setHasExternalChanges(false);
            }
          }}
          language="json"
          minHeight={400}
          maxHeight={600}
          placeholder={t('config.jsonEditorPlaceholder')}
        />
        <Alert
          message={t('config.jsonEditorWarning')}
          type="warning"
          showIcon
          style={{ marginTop: 16 }}
        />
      </Spin>
    </Modal>
  );
};
