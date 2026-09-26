import { copyPath, revealInFileManager } from '../../utils/revealPath';
import { filesApi } from '../../services/api/files';
import { getHostCapabilities, copyToClipboard } from '../../utils/hostCapabilities';

jest.mock('../../services/api/files', () => ({
  filesApi: { getFileLocation: jest.fn() },
}));

jest.mock('../../utils/hostCapabilities', () => ({
  getHostCapabilities: jest.fn(),
  copyToClipboard: jest.fn(),
}));

const getFileLocation = filesApi.getFileLocation as jest.Mock;
const getCapabilities = getHostCapabilities as jest.Mock;
const copyToClipboardMock = copyToClipboard as jest.Mock;

/**
 * An axios-shaped success response for `GET /files/location`.
 *
 * The handler answers flat (`{success, path, directory, exists, ...}`), like
 * the other file endpoints, so the path is at `response.data.path` and NOT
 * under a `data` envelope. Getting this wrong makes every path resolve to
 * `undefined` while every mocked test still passes.
 */
const located = (path: string, exists = true) => ({
  data: { success: true, path, directory: path, exists, isDirectory: true },
});

describe('revealInFileManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCapabilities.mockReturnValue({});
    // jsdom has no clipboard by default.
    Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } });
    copyToClipboardMock.mockResolvedValue(undefined);
  });

  const writeText = () => copyToClipboardMock;

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
    getCapabilities.mockReturnValue({});

    const result = await revealInFileManager({ type: 'novel' });

    expect(result.reason).toBe('no-host');
    expect(writeText()).toHaveBeenCalledWith('/downloads/novels');
  });

  it('asks the host to show it and copies when the host says the path is not here', async () => {
    // A desktop host knows its own disk better than the backend does: the
    // backend may be on another machine, so a path it can see may still be
    // absent here. The host refusing is what turns this into a copy.
    getFileLocation.mockResolvedValue(located('/downloads/illustrations'));
    const revealPath = jest.fn().mockRejectedValue(new Error('no such file'));
    getCapabilities.mockReturnValue({ revealPath });

    const result = await revealInFileManager({ type: 'illustration' });

    expect(revealPath).toHaveBeenCalledWith('/downloads/illustrations');
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

    expect(result.outcome).toBe('failed');
    expect(result.path).toBeUndefined();
    expect(copyToClipboardMock).not.toHaveBeenCalled();
  });

  it('fails when neither the file manager nor the clipboard is available', async () => {
    getFileLocation.mockResolvedValue(located('/downloads/illustrations'));
    copyToClipboardMock.mockRejectedValue(new Error('denied'));

    const result = await revealInFileManager({ type: 'illustration' });

    expect(result.outcome).toBe('failed');
    expect(result.path).toBe('/downloads/illustrations');
  });
});

describe('copyPath', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCapabilities.mockReturnValue({});
    copyToClipboardMock.mockResolvedValue(undefined);
  });

  it('resolves the path through the backend before copying it', async () => {
    // History rows written by older versions can hold a relative path, so the
    // backend-resolved absolute path is the only honest thing to paste.
    getFileLocation.mockResolvedValue(located('/downloads/illustrations/a.jpg'));

    const result = await copyPath({ filePath: 'a.jpg', type: 'illustration' });

    expect(getFileLocation).toHaveBeenCalledWith({ path: 'a.jpg', type: 'illustration' });
    expect(copyToClipboardMock).toHaveBeenCalledWith('/downloads/illustrations/a.jpg');
    expect(result).toEqual({ outcome: 'copied', path: '/downloads/illustrations/a.jpg' });
  });

  it('copies a path even when the file is gone from disk', async () => {
    // The row still tells the user where their download used to live.
    getFileLocation.mockResolvedValue(located('/downloads/illustrations/gone.jpg', false));

    const result = await copyPath({ filePath: 'gone.jpg' });

    expect(result.outcome).toBe('copied');
    expect(copyToClipboardMock).toHaveBeenCalledWith('/downloads/illustrations/gone.jpg');
  });

  it('refuses to copy a raw argument the backend could not resolve', async () => {
    getFileLocation.mockRejectedValue(new Error('FILE_PATH_INVALID'));

    const result = await copyPath({ filePath: '/etc/hosts' });

    expect(result.outcome).toBe('failed');
    expect(result.reason).toBe('unavailable');
    expect(copyToClipboardMock).not.toHaveBeenCalled();
  });

  it('fails when this runtime has no clipboard at all', async () => {
    getFileLocation.mockResolvedValue(located('/downloads/illustrations'));
    copyToClipboardMock.mockRejectedValue(new Error('denied'));

    const result = await copyPath({ type: 'illustration' });

    expect(result).toEqual({
      outcome: 'failed',
      path: '/downloads/illustrations',
      reason: 'unavailable',
      error: expect.any(Error),
    });
  });
});
