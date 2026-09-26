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
   * Show a downloaded file (or the download directory) in the system file
   * manager.
   *
   * `resolveOnly` answers with the directory that would be opened and never
   * touches the OS — the WebUI resolves through it first so a desktop host can
   * open the local directory itself instead of asking the backend to.
   *
   * @param options.path - File path (absolute, or relative to the download dir)
   * @param options.type - Which download directory the path lives in
   * @param options.resolveOnly - Only resolve, never open
   */
  revealFile: (options?: {
    path?: string;
    type?: 'illustration' | 'novel';
    resolveOnly?: boolean;
  }): Promise<AxiosResponse<ApiResponse<{ path?: string; exists?: boolean }>>> =>
    apiClient.post('/files/reveal', options),
};

