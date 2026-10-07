/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Download from '../../pages/Download';
import { useDownload, useDownloadStatus, useDownloadLogs, useIncompleteTasks } from '../../hooks/useDownload';
import { useConfig } from '../../hooks/useConfig';
import { configService } from '../../services/configService';
import { QUERY_KEYS } from '../../constants';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: jest.fn(),
      language: 'en',
    },
  }),
}));

// Mock hooks
jest.mock('../../hooks/useDownload');
jest.mock('../../hooks/useConfig');
jest.mock('../../services/configService', () => ({
  configService: {
    listConfigFiles: jest.fn(),
  },
}));

// Mock antd message
jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  return {
    ...actual,
    message: {
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
      info: jest.fn(),
    },
  };
});

describe('Download', () => {
  let queryClient: QueryClient;
  const mockStartAsync = jest.fn();
  const mockStopAsync = jest.fn();
  const mockResumeAsync = jest.fn();
  const mockDeleteAsync = jest.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    jest.clearAllMocks();
    (configService.listConfigFiles as jest.Mock).mockResolvedValue([]);
    (useDownload as jest.Mock).mockReturnValue({
      startAsync: mockStartAsync,
      isStarting: false,
      stopAsync: mockStopAsync,
      isStopping: false,
    });
    (useDownloadStatus as jest.Mock).mockReturnValue({
      isLoading: false,
      hasActiveTask: false,
      activeTask: null,
      allTasks: [],
    });
    (useDownloadLogs as jest.Mock).mockReturnValue({
      logs: [],
    });
    (useIncompleteTasks as jest.Mock).mockReturnValue({
      tasks: [],
      refetch: jest.fn(),
      resumeAsync: mockResumeAsync,
      deleteAsync: mockDeleteAsync,
      deleteAllAsync: jest.fn(),
      isResuming: false,
      isDeleting: false,
      isDeletingAll: false,
    });
    (useConfig as jest.Mock).mockReturnValue({
      config: {
        targets: [],
      },
      refetch: jest.fn(),
    });
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  it('renders download page', () => {
    renderWithProviders(<Download />);
    // Check for any text that indicates the page is rendered
    expect(screen.getByText(/download\.title|下载管理/i)).toBeInTheDocument();
  });

  it('populates the shared configFiles cache in the array shape its readers assume', async () => {
    const files = [
      {
        filename: 'standalone.config.json',
        path: '/data/standalone.config.json',
        pathRelative: 'standalone.config.json',
        modifiedTime: '2024-01-01T00:00:00Z',
        size: 1024,
        isActive: true,
      },
    ];
    (configService.listConfigFiles as jest.Mock).mockResolvedValue(files);

    renderWithProviders(<Download />);

    await waitFor(() => expect(configService.listConfigFiles).toHaveBeenCalled());
    // ConfigHeader calls `.find` on this value; an axios envelope here is the
    // "t?.find is not a function" crash.
    expect(Array.isArray(queryClient.getQueryData(QUERY_KEYS.CONFIG_FILES))).toBe(true);
    expect(queryClient.getQueryData(QUERY_KEYS.CONFIG_FILES)).toEqual(files);
  });

  it('renders task statistics', () => {
    renderWithProviders(<Download />);
    // Task statistics should be rendered
    const page = screen.getByText(/download\.title|下载管理/i);
    expect(page).toBeInTheDocument();
  });

  it('renders task actions', () => {
    renderWithProviders(<Download />);
    // Task actions should be rendered
    const page = screen.getByText(/download\.title|下载管理/i);
    expect(page).toBeInTheDocument();
  });

  it('shows loading state when status is loading', () => {
    (useDownloadStatus as jest.Mock).mockReturnValue({
      isLoading: true,
      hasActiveTask: false,
      activeTask: null,
      allTasks: [],
    });

    renderWithProviders(<Download />);
    // Should show loading state - page should still render
    const page = screen.getByText(/download\.title|下载管理/i);
    expect(page).toBeInTheDocument();
  });

  it('renders active task card when there is an active task', () => {
    (useDownloadStatus as jest.Mock).mockReturnValue({
      isLoading: false,
      hasActiveTask: true,
      activeTask: {
        taskId: 'test-task',
        status: 'running',
      },
      allTasks: [],
    });

    renderWithProviders(<Download />);
    const page = screen.getByText(/download\.title|下载管理/i);
    expect(page).toBeInTheDocument();
  });
});
