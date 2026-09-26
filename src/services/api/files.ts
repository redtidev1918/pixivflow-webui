import { AxiosResponse } from 'axios';
import { apiClient } from './client';
import { ApiResponse, FilesResponse, FileItem, NormalizeFilesResult } from './types';

/**
 * Files API service
 */
export const filesApi = {
  /**
   * List files in a directory
   */
  listFiles: (params?: {
    path?: string;
    type?: string;
    sort?: string;
    order?: string;
    dateFilter?: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'all';
  }): Promise<AxiosResponse<ApiResponse<FilesResponse>>> =>
    apiClient.get('/files/list', { params }),

  /**
   * Get recently downloaded files
   * 
   * Retrieves a list of recently downloaded files with optional filtering.
   * 
   * @param params - Query parameters
   * @param params.limit - Maximum number of files to return (default: 50)
   * @param params.type - File type filter: 'illustration' | 'novel' | undefined (all types)
   * @param params.filter - Time filter: 'today' | 'yesterday' | 'last7days' | 'last30days'
   * @returns Promise resolving to API response containing array of file items
   * 
   * @example
   * ```typescript
   * // Get last 10 illustrations downloaded today
   * const response = await filesApi.getRecentFiles({ 
   *   limit: 10, 
   *   type: 'illustration', 
   *   filter: 'today' 
   * });
   * const files = response.data.data.files;
   * ```
   */
  getRecentFiles: (params?: {
    limit?: number;
    type?: 'illustration' | 'novel';
    filter?: 'today' | 'yesterday' | 'last7days' | 'last30days';
  }): Promise<AxiosResponse<ApiResponse<{ files: FileItem[] }>>> =>
    apiClient.get('/files/recent', { params }),

  /**
   * Get file preview (image or text content)
   * @param path - File path
   * @param type - File type
   */
  getFilePreview: (path: string, type?: string): Promise<AxiosResponse<Blob>> =>
    apiClient.get('/files/preview', { params: { path, type }, responseType: 'blob' }),

  /**
   * Delete a file
   * @param id - File ID or name
   * @param params - Additional parameters (path, type)
   */
  deleteFile: (
    id: string,
    params?: { path?: string; type?: string }
  ): Promise<AxiosResponse<ApiResponse<void>>> =>
    apiClient.delete(`/files/${id}`, { params }),

  /**
   * Normalize files (rename, reorganize, update database)
   * @param options - Normalization options
   */
  normalizeFiles: (options?: {
    dryRun?: boolean;
    normalizeNames?: boolean;
    reorganize?: boolean;
    updateDatabase?: boolean;
    type?: 'illustration' | 'novel' | 'all';
  }): Promise<AxiosResponse<ApiResponse<NormalizeFilesResult>>> =>
    apiClient.post('/files/normalize', options),

  /**
   * Ask where a downloaded file — or a download directory — is on disk.
   *
   * This is a *question*, not an action: the backend resolves the path,
   * confines it to the configured download directory and reports whether it
   * exists. It never opens a file manager, because for a container, a NAS or a
   * VPS the backend is not on the machine the user is looking at.
   *
   * Showing the answer on screen is the host's job — see
   * `src/utils/revealPath.ts` and `src/utils/hostCapabilities.ts`.
   *
   * @param options.path - File path (absolute, or relative to the download dir).
   *   Omit to ask for the download directory itself.
   * @param options.type - Which download directory the path lives in.
   */
  getFileLocation: (options?: {
    path?: string;
    type?: 'illustration' | 'novel';
  }): Promise<
    AxiosResponse<
      ApiResponse<{
        path: string;
        directory: string;
        exists: boolean;
        isDirectory: boolean;
      }>
    >
  > => apiClient.get('/files/location', { params: options }),
};

