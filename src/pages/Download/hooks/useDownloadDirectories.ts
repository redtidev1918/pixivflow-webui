import { useQuery } from '@tanstack/react-query';
import { filesApi } from '../../../services/api/files';

/** One configured download directory, as the backend resolves it. */
export interface DownloadDirectory {
  /** Absolute path, ready to copy into a terminal or open in a file manager. */
  path: string;
  /**
   * Whether it is on the backend's disk right now. A fresh install has neither
   * directory until the first download, and pretending otherwise would offer
   * the user a path they cannot use.
   */
  exists: boolean;
}

export interface DownloadDirectories {
  illustration?: DownloadDirectory;
  novel?: DownloadDirectory;
}

const DIRECTORY_TYPES = ['illustration', 'novel'] as const;

/**
 * Where the backend actually keeps downloads, for the download page.
 *
 * The configured `storage.*Directory` values are written by hand and are
 * usually relative (`./downloads/illustrations`), so they cannot be copied or
 * opened as-is. `GET /api/files/location` answers with the resolved absolute
 * directory instead — a question, not an action, so it is safe to ask on a
 * page load and on a plain server.
 */
export function useDownloadDirectories(enabled = true) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['downloadDirectories'],
    enabled,
    queryFn: async (): Promise<DownloadDirectories> => {
      const resolved: DownloadDirectories = {};

      await Promise.all(
        DIRECTORY_TYPES.map(async (type) => {
          try {
            const response = await filesApi.getFileLocation({ type });
            const location = response.data;
            if (location?.path) {
              resolved[type] = { path: location.path, exists: location.exists };
            }
          } catch {
            // A directory the backend cannot resolve is simply not offered;
            // the download page must still render.
          }
        })
      );

      return resolved;
    },
  });

  return { directories: data, directoriesLoading: isLoading, refetchDirectories: refetch };
}
