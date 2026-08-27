import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { downloadService } from '../services/downloadService';
import { ConfigData } from '../services/api';
import { acquireSocket, releaseSocket, DownloadSnapshotPayload } from '../services/socket';
import { useErrorHandler } from './useErrorHandler';
import { QUERY_KEYS, REFRESH_INTERVALS } from '../constants';

/**
 * Hook for managing download tasks
 */
export function useDownload() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  const startMutation = useMutation({
    mutationFn: ({
      targetId,
      config,
      configPaths,
    }: {
      targetId?: string;
      config?: Partial<ConfigData>;
      configPaths?: string[];
    }) => downloadService.startDownload(targetId, config, configPaths),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DOWNLOAD_STATUS() });
    },
    onError: (error) => handleError(error),
  });

  const stopMutation = useMutation({
    mutationFn: (taskId: string) => downloadService.stopDownload(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DOWNLOAD_STATUS() });
    },
    onError: (error) => handleError(error),
  });

  return {
    start: startMutation.mutate,
    startAsync: startMutation.mutateAsync,
    isStarting: startMutation.isPending,
    stop: stopMutation.mutate,
    stopAsync: stopMutation.mutateAsync,
    isStopping: stopMutation.isPending,
  };
}

/**
 * Hook for managing download status
 */
export function useDownloadStatus(taskId?: string, refetchInterval?: number | false) {
  const queryClient = useQueryClient();
  const {
    data: status,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.DOWNLOAD_STATUS(taskId),
    queryFn: () => downloadService.getDownloadStatus(taskId),
    // Polling stays as a safety net; the realtime channel keeps latency low.
    refetchInterval: refetchInterval ?? REFRESH_INTERVALS.DOWNLOAD_STATUS,
  });

  useEffect(() => {
    const socket = acquireSocket();

    const previousActiveStatus = () => {
      const cached = queryClient.getQueryData<{ hasActiveTask: boolean; activeTask: { status?: string } | null }>(
        QUERY_KEYS.DOWNLOAD_STATUS(undefined)
      );
      return cached?.activeTask?.status ?? null;
    };

    const handleSnapshot = (...args: unknown[]): void => {
      const payload = args[0] as DownloadSnapshotPayload | undefined;
      if (!payload || payload.kind !== 'snapshot') return;

      const prev = previousActiveStatus();
      const next = payload.status.activeTask as { status?: string; taskId?: string } | null;

      // Full snapshot mirrors GET /api/download/status for the overview view.
      if (!taskId) {
        queryClient.setQueryData(QUERY_KEYS.DOWNLOAD_STATUS(undefined), payload.status);
      }

      // Task finished (any running -> terminal transition): refresh derived caches.
      if (prev === 'running' && next === null && !payload.status.hasActiveTask) {
        void queryClient.invalidateQueries({ queryKey: ['stats'] });
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DOWNLOAD_HISTORY() });
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INCOMPLETE_TASKS });
      }
    };

    socket.on('download', handleSnapshot);
    return () => {
      socket.off('download', handleSnapshot);
      releaseSocket();
    };
  }, [queryClient, taskId]);

  return {
    status,
    isLoading,
    error,
    refetch,
    hasActiveTask: status?.hasActiveTask ?? false,
    activeTask: status?.activeTask,
    allTasks: status?.allTasks ?? [],
  };
}

/**
 * Hook for managing download task logs
 */
export function useDownloadLogs(taskId: string | undefined, limit?: number, refetchInterval?: number | false) {
  const {
    data: logsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.DOWNLOAD_LOGS(taskId!),
    queryFn: () => downloadService.getTaskLogs(taskId!, limit),
    enabled: !!taskId,
    refetchInterval: taskId && (refetchInterval ?? REFRESH_INTERVALS.TASK_LOGS) ? refetchInterval ?? REFRESH_INTERVALS.TASK_LOGS : false,
  });

  return {
    logs: logsData?.logs ?? [],
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook for managing download history
 */
export function useDownloadHistory(params?: {
  page?: number;
  limit?: number;
  type?: string;
  tag?: string;
  author?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'downloadedAt' | 'title' | 'author' | 'pixivId';
  sortOrder?: 'asc' | 'desc';
}) {
  const {
    data: historyData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.DOWNLOAD_HISTORY(params),
    queryFn: () => downloadService.getDownloadHistory(params),
  });

  return {
    items: historyData?.items ?? [],
    total: historyData?.total ?? 0,
    page: historyData?.page ?? 1,
    limit: historyData?.limit ?? 20,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook for managing incomplete download tasks
 */
export function useIncompleteTasks() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  const {
    data: incompleteTasksData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.INCOMPLETE_TASKS,
    queryFn: () => downloadService.getIncompleteTasks(),
  });

  const resumeMutation = useMutation({
    mutationFn: ({ tag, type }: { tag: string; type: 'illustration' | 'novel' }) =>
      downloadService.resumeDownload(tag, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INCOMPLETE_TASKS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DOWNLOAD_STATUS() });
    },
    onError: (error) => handleError(error),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => downloadService.deleteIncompleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INCOMPLETE_TASKS });
    },
    onError: (error) => handleError(error),
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => downloadService.deleteAllIncompleteTasks(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INCOMPLETE_TASKS });
    },
    onError: (error) => handleError(error),
  });

  return {
    tasks: incompleteTasksData?.tasks ?? [],
    isLoading,
    error,
    refetch,
    resume: resumeMutation.mutate,
    resumeAsync: resumeMutation.mutateAsync,
    isResuming: resumeMutation.isPending,
    delete: deleteMutation.mutate,
    deleteAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteAll: deleteAllMutation.mutate,
    deleteAllAsync: deleteAllMutation.mutateAsync,
    isDeletingAll: deleteAllMutation.isPending,
  };
}

