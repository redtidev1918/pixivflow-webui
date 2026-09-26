import { revealInFileManager } from '../../utils/revealPath';
import { filesApi } from '../../services/api/files';
import { getHostCapabilities } from '../../utils/hostCapabilities';

jest.mock('../../services/api/files', () => ({
  filesApi: { getFileLocation: jest.fn() },
}));

jest.mock('../../utils/hostCapabilities', () => ({
  getHostCapabilities: jest.fn(),
}));

const getFileLocation = filesApi.getFileLocation as jest.Mock;
const getCapabilities = getHostCapabilities as jest.Mock;

/**
 * An axios-shaped success response for `GET /files/location` — the backend
 * answers with a flat handler body, not the generic `ApiResponse` envelope.
 */
const located = (path: string, exists = true) => ({
  data: { success: true, path, directory: path, exists, isDirectory: true },
});

describe('revealInFileManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCapabilities.mockReturnValue(null);
    // jsdom has no clipboard by default.
    Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } });
  });

  const writeText = () => navigator.clipboard.writeText as jest.Mock;

  it('asks the backend where the file is, and never asks it to open anything', async () => {
    getFileLocation.mockResolvedValue(located('/downloads/illustrations/a.jpg'));
    getCapabilities.mockReturnValue({ revealPath: jest.fn().mockResolvedValue(undefined) });

    await revealInFileManager({ filePath: 'a.jpg', type: 'illustration' });

    expect(getFileLocation).toHaveBeenCalledWith({
      path: 'a.jpg',
      type: 'illustration',
    });
  });

  it('lets the host show the resolved path', async () => {
    getFileLocation.mockResolvedValue(located('/downloads/illustrations/a.jpg'));
    const revealPath = jest.fn().mockResolvedValue(undefined);
    getCapabilities.mockReturnValue({ revealPath });

    const result = await revealInFileManager({ filePath: 'a.jpg' });

    expect(revealPath).toHaveBeenCalledWith('/downloads/illustrations/a.jpg');
    expect(result).toEqual({ outcome: 'revealed', path: '/downloads/illustrations/a.jpg' });
  });

  it('resolves the download directory itself when no file is given', async () => {
    getFileLocation.mockResolvedValue(located('/downloads/illustrations'));
    const revealPath = jest.fn().mockResolvedValue(undefined);
    getCapabilities.mockReturnValue({ revealPath });

    const result = await revealInFileManager({ type: 'illustration' });

    expect(getFileLocation).toHaveBeenCalledWith({ path: undefined, type: 'illustration' });
    expect(revealPath).toHaveBeenCalledWith('/downloads/illustrations');
    expect(result.outcome).toBe('revealed');
  });

  it('copies the path when this runtime has no host at all', async () => {
    getFileLocation.mockResolvedValue(located('/downloads/illustrations'));

    const result = await revealInFileManager({ type: 'illustration' });

    expect(writeText()).toHaveBeenCalledWith('/downloads/illustrations');
    expect(result).toEqual({
      outcome: 'copied',
      path: '/downloads/illustrations',
      reason: 'no-host',
    });
  });

  it('copies the path when the host shipped without the reveal capability', async () => {
    // A host that predates `revealPath` still injects `window.pixivflowHost`,
    // so the capability layer reports no capabilities rather than an error.
    getFileLocation.mockResolvedValue(located('/downloads/novels'));
    getCapabilities.mockReturnValue(null);

    const result = await revealInFileManager({ type: 'novel' });

    expect(result.reason).toBe('no-host');
    expect(writeText()).toHaveBeenCalledWith('/downloads/novels');
  });

  it('copies the path for a folder that does not exist on this machine yet', async () => {
    getFileLocation.mockResolvedValue(located('/downloads/illustrations', false));
    const revealPath = jest.fn();
    getCapabilities.mockReturnValue({ revealPath });

    const result = await revealInFileManager({ type: 'illustration' });

    expect(revealPath).not.toHaveBeenCalled();
    expect(result).toEqual({
      outcome: 'copied',
      path: '/downloads/illustrations',
      reason: 'missing',
    });
  });

  it('copies the path when the host cannot show it (a remote backend path)', async () => {
    getFileLocation.mockResolvedValue(located('/srv/pixivflow/downloads/illustrations'));
    getCapabilities.mockReturnValue({
      revealPath: jest.fn().mockRejectedValue(new Error('path does not exist')),
    });

    const result = await revealInFileManager({ type: 'illustration' });

    expect(result).toEqual({
      outcome: 'copied',
      path: '/srv/pixivflow/downloads/illustrations',
      reason: 'missing',
    });
  });

  it('fails when the backend cannot resolve the path', async () => {
    getFileLocation.mockRejectedValue(new Error('FILE_PATH_INVALID'));

    const result = await revealInFileManager({ filePath: '/etc/hosts' });

    expect(result.outcome).toBe('failed');
    expect(writeText()).not.toHaveBeenCalled();
  });

  it('fails when the backend resolves nothing to show', async () => {
    getFileLocation.mockResolvedValue({ data: { success: true } });

    const result = await revealInFileManager({ type: 'illustration' });

    expect(result).toEqual({ outcome: 'failed' });
  });

  it('fails when neither the file manager nor the clipboard is available', async () => {
    getFileLocation.mockResolvedValue(located('/downloads/illustrations'));
    (navigator.clipboard.writeText as jest.Mock).mockRejectedValue(new Error('denied'));

    const result = await revealInFileManager({ type: 'illustration' });

    expect(result.outcome).toBe('failed');
    expect(result.path).toBe('/downloads/illustrations');
  });
});
