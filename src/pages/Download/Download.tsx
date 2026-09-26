import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { QUERY_KEYS } from '../../constants';
import { configService } from '../../services/configService';
import {
  useDownload,
  useDownloadStatus,
  useDownloadLogs,
  useIncompleteTasks,
} from '../../hooks/useDownload';
import { useConfig } from '../../hooks/useConfig';
import {
  TaskStatistics,
  TaskActions,
  ActiveTaskCard,
  IncompleteTasksTable,
  TaskHistoryTable,
  StartDownloadModal,
} from './components';
import {
  useDownloadDirectories,
  useDownloadOperations,
  useDownloadStatistics,
} from './hooks';
import { PageHeader } from '../../components/common';

export default function Download() {
  const { t } = useTranslation();

  // Use hooks for download operations
  const {
    startAsync: startDownloadAsync,
    isStarting,
    stopAsync: stopDownloadAsync,
    isStopping,
  } = useDownload();

  const {
    isLoading: statusLoading,
    hasActiveTask,
    activeTask,
    allTasks,
  } = useDownloadStatus(undefined, 2000);

  const activeTaskId = activeTask?.taskId;
  const { logs: taskLogs } = useDownloadLogs(activeTaskId, undefined, 2000);

  const {
    tasks: incompleteTasks,
    refetch: refetchIncompleteTasks,
    resumeAsync: resumeDownloadAsync,
    deleteAsync: deleteIncompleteTaskAsync,
    deleteAllAsync: deleteAllIncompleteTasksAsync,
    isResuming,
    isDeleting,
    isDeletingAll,
  } = useIncompleteTasks();

  // Get config to show available targets and paths
  const { config: configData, refetch: refetchConfig } = useConfig();

  // Where downloads really land: the configured `storage.*Directory` values are
  // usually relative, so ask the backend for the resolved absolute directories
  // instead of printing (and copying) a path that only makes sense on its disk.
  const { directories, refetchDirectories } = useDownloadDirectories();

  const refreshPaths = () => {
    refetchConfig();
    refetchDirectories();
  };

  // Get configuration files list
  // Read the shared `configFiles` cache through configService (a plain
  // ConfigFileInfo[]), never the raw axios envelope: the same query key is read
  // by useConfigFiles()/ConfigHeader, which calls `.find` on it.
  const { data: configFilesData } = useQuery({
    queryKey: QUERY_KEYS.CONFIG_FILES,
    queryFn: () => configService.listConfigFiles(),
  });

  // Download operations
  const {
    showStartModal,
    setShowStartModal,
    handleStart,
    handleStop,
    handleRunAll,
    handleResume,
    handleDelete,
    handleDeleteAll
  } = useDownloadOperations(
    startDownloadAsync,
    stopDownloadAsync,
    resumeDownloadAsync,
    deleteIncompleteTaskAsync,
    deleteAllIncompleteTasksAsync
  );

  // Statistics
  const { taskStats, calculateDuration } = useDownloadStatistics(allTasks);

  return (
    <div className="page">
      <PageHeader
        title={t('download.title')}
        description={t('download.description')}
      />

      <TaskStatistics
        total={taskStats.total}
        completed={taskStats.completed}
        failed={taskStats.failed}
        stopped={taskStats.stopped}
      />

      <TaskActions
        hasActiveTask={hasActiveTask}
        onStartClick={() => setShowStartModal(true)}
        onRunAllClick={handleRunAll}
        onStopClick={() => activeTask?.taskId && handleStop(activeTask.taskId)}
        isStarting={isStarting}
        isRunningAll={false}
        isStopping={isStopping}
        directories={directories}
        onRefreshConfig={refreshPaths}
      />

      {activeTask && (
        <ActiveTaskCard
          task={activeTask}
          logs={taskLogs}
          onStop={() => activeTask.taskId && handleStop(activeTask.taskId)}
          isStopping={isStopping}
        />
      )}

      {incompleteTasks && incompleteTasks.length > 0 && (
        <IncompleteTasksTable
          tasks={incompleteTasks}
          hasActiveTask={hasActiveTask}
          onRefresh={refetchIncompleteTasks}
          onResume={handleResume}
          onDelete={handleDelete}
          onDeleteAll={handleDeleteAll}
          isResuming={isResuming}
          isDeleting={isDeleting}
          isDeletingAll={isDeletingAll}
        />
      )}

      <TaskHistoryTable
        tasks={allTasks || []}
        isLoading={statusLoading}
        calculateDuration={calculateDuration}
      />

      <StartDownloadModal
        open={showStartModal}
        onCancel={() => setShowStartModal(false)}
        onFinish={handleStart}
        isSubmitting={isStarting}
        configFiles={configFilesData || []}
        targets={configData?.targets || []}
      />
    </div>
  );
}