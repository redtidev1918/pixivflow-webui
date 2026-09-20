/**
 * Tests for UrlDownload page
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { UrlDownload } from '../../pages/UrlDownload';
import { downloadApi } from '../../services/api';

// Mock the API
jest.mock('../../services/api', () => ({
  downloadApi: {
    parseUrl: jest.fn(),
    downloadFromUrl: jest.fn(),
    downloadFromBatchUrls: jest.fn(),
  },
}));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) {
        return `${key}_${JSON.stringify(params)}`;
      }
      return key;
    },
  }),
}));

describe('UrlDownload', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <UrlDownload />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  describe('Single URL Download', () => {
    it('should render single URL input', () => {
      renderComponent();
      
      expect(screen.getByText('download.urlDownload.title')).toBeInTheDocument();
      expect(screen.getByText('download.urlDownload.singleDownload')).toBeInTheDocument();
    });

    it('should parse valid URL successfully', async () => {
      const user = userEvent.setup();
      (downloadApi.parseUrl as jest.Mock).mockResolvedValue({
        data: {
          data: {
            success: true,
            workId: '123456',
            workType: 'illustration',
          },
        },
      });

      renderComponent();

      const input = screen.getByPlaceholderText('download.urlDownload.placeholder');
      await user.type(input, 'https://www.pixiv.net/artworks/123456');

      const parseButton = screen.getByText('download.urlDownload.parseUrl');
      await user.click(parseButton);

      await waitFor(() => {
        expect(downloadApi.parseUrl).toHaveBeenCalledWith('https://www.pixiv.net/artworks/123456');
      });
    });

    it('should handle parse error', async () => {
      const user = userEvent.setup();
      (downloadApi.parseUrl as jest.Mock).mockRejectedValue({
        response: {
          data: {
            message: 'Invalid URL',
          },
        },
      });

      renderComponent();

      const input = screen.getByPlaceholderText('download.urlDownload.placeholder');
      await user.type(input, 'invalid-url');

      const parseButton = screen.getByText('download.urlDownload.parseUrl');
      await user.click(parseButton);

      await waitFor(() => {
        expect(downloadApi.parseUrl).toHaveBeenCalled();
      });
    });

    it('should download single URL', async () => {
      const user = userEvent.setup();
      (downloadApi.downloadFromUrl as jest.Mock).mockResolvedValue({
        data: { success: true },
      });

      renderComponent();

      const input = screen.getByPlaceholderText('download.urlDownload.placeholder');
      await user.type(input, 'https://www.pixiv.net/artworks/123456');

      const downloadButtons = screen.getAllByText('download.urlDownload.download');
      await user.click(downloadButtons[0]);

      await waitFor(() => {
        expect(downloadApi.downloadFromUrl).toHaveBeenCalledWith('https://www.pixiv.net/artworks/123456');
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/download');
      }, { timeout: 2000 });
    });
  });

  describe('Batch URL Download', () => {
    it('should render batch URL input', () => {
      renderComponent();
      
      expect(screen.getByText('download.urlDownload.batchDownload')).toBeInTheDocument();
    });

    it('should parse multiple URLs', async () => {
      const user = userEvent.setup();
      (downloadApi.parseUrl as jest.Mock)
        .mockResolvedValueOnce({
          data: {
            data: {
              success: true,
              workId: '123456',
              workType: 'illustration',
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              success: true,
              workId: '789012',
              workType: 'illustration',
            },
          },
        });

      renderComponent();

      const textarea = screen.getByPlaceholderText('download.urlDownload.batchPlaceholder');
      await user.type(textarea, 'https://www.pixiv.net/artworks/123456\nhttps://www.pixiv.net/artworks/789012');

      const parseButton = screen.getByText('download.urlDownload.parseUrls');
      await user.click(parseButton);

      await waitFor(() => {
        expect(downloadApi.parseUrl).toHaveBeenCalledTimes(2);
      });
    });

    it('should download batch URLs', async () => {
      const user = userEvent.setup();
      (downloadApi.parseUrl as jest.Mock).mockResolvedValue({
        data: {
          data: {
            success: true,
            workId: '123456',
            workType: 'illustration',
          },
        },
      });
      (downloadApi.downloadFromBatchUrls as jest.Mock).mockResolvedValue({
        data: {
          data: {
            validUrls: 2,
          },
        },
      });

      renderComponent();

      const textarea = screen.getByPlaceholderText('download.urlDownload.batchPlaceholder');
      await user.type(textarea, 'https://www.pixiv.net/artworks/123456\nhttps://www.pixiv.net/artworks/789012');

      const parseButton = screen.getByText('download.urlDownload.parseUrls');
      await user.click(parseButton);

      await waitFor(() => {
        expect(downloadApi.parseUrl).toHaveBeenCalled();
      });

      const downloadButton = screen.getByText(/download.urlDownload.downloadAll/);
      await user.click(downloadButton);

      await waitFor(() => {
        expect(downloadApi.downloadFromBatchUrls).toHaveBeenCalled();
      });
    });

    it('should clear all inputs', async () => {
      const user = userEvent.setup();
      renderComponent();

      const singleInput = screen.getByPlaceholderText('download.urlDownload.placeholder');
      await user.type(singleInput, 'test url');

      const clearButton = screen.getByText('download.urlDownload.clear');
      await user.click(clearButton);

      expect(singleInput).toHaveValue('');
    });
  });

  describe('URL List Management', () => {
    it('should display parsed URLs', async () => {
      const user = userEvent.setup();
      (downloadApi.parseUrl as jest.Mock)
        .mockResolvedValueOnce({
          data: {
            data: {
              success: true,
              workId: '123456',
              workType: 'illustration',
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              success: true,
              workId: '789012',
              workType: 'illustration',
            },
          },
        });

      renderComponent();

      const textarea = screen.getByPlaceholderText('download.urlDownload.batchPlaceholder');
      await user.type(textarea, 'https://www.pixiv.net/artworks/123456\nhttps://www.pixiv.net/artworks/789012');

      const parseButton = screen.getByText('download.urlDownload.parseUrls');
      await user.click(parseButton);

      await waitFor(() => {
        expect(screen.getByText('download.urlDownload.urlList')).toBeInTheDocument();
      });
    });

    it('should remove URL from list', async () => {
      const user = userEvent.setup();
      (downloadApi.parseUrl as jest.Mock).mockResolvedValue({
        data: {
          data: {
            success: true,
            workId: '123456',
            workType: 'illustration',
          },
        },
      });

      renderComponent();

      const textarea = screen.getByPlaceholderText('download.urlDownload.batchPlaceholder');
      await user.type(textarea, 'https://www.pixiv.net/artworks/123456\nhttps://www.pixiv.net/artworks/789012');

      const parseButton = screen.getByText('download.urlDownload.parseUrls');
      await user.click(parseButton);

      await waitFor(() => {
        const removeButtons = screen.getAllByText('download.urlDownload.remove');
        expect(removeButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Help Section', () => {
    it('should display help information', () => {
      renderComponent();
      
      expect(screen.getByText('download.urlDownload.helpTitle')).toBeInTheDocument();
      expect(screen.getByText('download.urlDownload.supportedFormats')).toBeInTheDocument();
    });
  });
});
