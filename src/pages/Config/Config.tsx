import { useState } from 'react';
import { Alert, Card, Collapse } from 'antd';
import { useTranslation } from 'react-i18next';
import { useConfigFiles } from '../../hooks/useConfig';
import { useConfigForm, useConfigOperations, useConfigModals, useConfigTabs } from './hooks';
import { ConfigHeader } from './components/ConfigHeader';
import { ConfigActions } from './components/ConfigActions';
import { ConfigTabs } from './components/ConfigTabs';
import { ConfigPreviewModal } from './components/ConfigPreviewModal';
import { ConfigJsonEditor } from './components/ConfigJsonEditor';
import { ConfigFilesManager } from './components/ConfigFilesManager';
import { ConfigHistoryManager } from './components/ConfigHistoryManager';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { PageHeader } from '../../components/common';

export default function Config() {
  const { t } = useTranslation();
  const { activeTab, setActiveTab } = useConfigTabs();
  const {
    previewVisible,
    jsonEditorVisible,
    editingConfigFile,
    openPreview,
    closePreview,
    openJsonEditor,
    closeJsonEditor,
  } = useConfigModals();

  const {
    form,
    config,
    isLoading,
    isUpdating,
    isValidating,
    handleSave,
    handleValidate,
    handleTargetChange,
    getConfigPreview,
    refreshConfig,
  } = useConfigForm();

  const {
    handleExportConfig,
    handleImportConfig,
    handleCopyConfig,
    handleConfigFileSwitch,
    handleConfigApplied,
    isImporting,
  } = useConfigOperations(config);

  const { configFiles, refetch: refetchConfigFiles } = useConfigFiles();

  const [managementOpen, setManagementOpen] = useState<string[]>([]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <LoadingSpinner />
      </div>
    );
  }

  const currentConfigPath =
    config?._meta?.configPathRelative ??
    config?._meta?.configPath ??
    t('config.unknown');

  const activeConfigFile = configFiles?.find((f) => f.isActive);

  const openActiveJsonEditor = () => {
    if (activeConfigFile) {
      openJsonEditor(activeConfigFile.filename);
    }
  };

  const handleManagementToggle = (keys: string | string[]) => {
    setManagementOpen(Array.isArray(keys) ? keys : [keys]);
  };

  return (
    <div className="page">
      <PageHeader
        title={t('config.title')}
        actions={
          <ConfigActions
            onRefresh={refreshConfig}
            onPreview={openPreview}
            onExport={handleExportConfig}
            onImport={handleImportConfig}
            onCopy={() => handleCopyConfig(getConfigPreview())}
            onValidate={handleValidate}
            onEditJson={activeConfigFile ? openActiveJsonEditor : undefined}
            onSave={handleSave}
            isValidating={isValidating}
            isUpdating={isUpdating}
            isImporting={isImporting}
          />
        }
      />

      <Alert
        type="info"
        showIcon
        message={t('config.introTitle')}
        description={<span className="config-intro-text">{t('config.intro')}</span>}
      />

      <Card variant="outlined" size="small">
        <ConfigHeader
          currentConfigPath={currentConfigPath}
          configFiles={configFiles}
          onConfigFileSwitch={handleConfigFileSwitch}
          refetchConfigFiles={refetchConfigFiles}
        />
      </Card>

      <ConfigTabs
        form={form}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onTargetChange={handleTargetChange}
      />

      <Collapse
        className="config-management"
        activeKey={managementOpen}
        onChange={handleManagementToggle}
        items={[
          {
            key: 'files',
            label: t('config.managementTitle'),
            children: (
              <ConfigFilesManager
                onConfigFileSwitch={handleConfigFileSwitch}
                onJsonEditorOpen={openJsonEditor}
              />
            ),
          },
          {
            key: 'history',
            label: t('config.configHistory'),
            children: <ConfigHistoryManager onConfigApplied={handleConfigApplied} />,
          },
        ]}
      />

      {/* Config Preview Modal */}
      <ConfigPreviewModal
        visible={previewVisible}
        configPreview={getConfigPreview()}
        onClose={closePreview}
      />

      {/* JSON Editor Modal - opens from the actions menu or the files section */}
      {jsonEditorVisible && editingConfigFile && (
        <ConfigJsonEditor
          visible={jsonEditorVisible}
          filename={editingConfigFile}
          onClose={closeJsonEditor}
          onConfigFileSwitch={handleConfigFileSwitch}
        />
      )}
    </div>
  );
}
