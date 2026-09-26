import { revealInFileManager } from '../../utils/revealPath';
import { filesApi } from '../../services/api/files';
import { getHostLoginBridge } from '../../utils/hostBridge';

jest.mock('../../services/api/files', () => ({
  filesApi: { revealFile: jest.fn() },
}));

jest.mock('../../utils/hostBridge', () => ({
  getHostLoginBridge: jest.fn(),
}));

const revealFile = filesApi.revealFile as jest.Mock;
const getBridge = getHostLoginBridge as jest.Mock;

/** An axios-shaped success response; `revealFile` returns the whole response. */
const ok = (body: unknown) => ({ data: body });

/** An axios-shaped rejection, as the interceptor turns a non-2xx answer into. */
const fail = (errorCode: string) => {
  const error = new Error(errorCode) as Error & { code?: string };
  error.code = errorCode;
  return error;
};

describe('revealInFileManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getBridge.mockReturnValue(undefined);
  });

  it('resolves through the backend before opening anything', async () => {
    revealFile.mockResolvedValue(ok({ path: '/downloads/illustrations', exists: true }));

    const result = await revealInFileManager({ type: 'illustration' });

    expect(revealFile).toHaveBeenCalledWith({
      path: undefined,
      type: 'illustration',
      resolveOnly: true,
    });
    expect(result).toEqual({ outcome: 'opened', path: '/downloads/illustrations' });
  });

  it('prefers the desktop host and never asks the backend to open it', async () => {
    revealFile.mockResolvedValue(ok({ path: '/downloads/illustrations', exists: true }));
    const openDirectory = jest.fn().mockResolvedValue(undefined);
    getBridge.mockReturnValue({ openDirectory });

    const result = await revealInFileManager({ filePath: '/downloads/illustrations/a.jpg' });

    expect(openDirectory).toHaveBeenCalledWith('/downloads/illustrations');
    expect(revealFile).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ outcome: 'opened', path: '/downloads/illustrations' });
  });

  it('falls back to the backend when the host cannot open the directory', async () => {
    revealFile
      .mockResolvedValueOnce(ok({ path: '/downloads/novels', exists: true }))
      .mockResolvedValueOnce(ok({ path: '/downloads/novels', errorCode: 'FILE_REVEAL_SUCCESS' }));
    getBridge.mockReturnValue({
      openDirectory: jest.fn().mockRejectedValue(new Error('acl denied')),
    });

    const result = await revealInFileManager({ type: 'novel' });

    expect(revealFile).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ outcome: 'opened', path: '/downloads/novels' });
  });

  it('reports a directory that does not exist yet as missing, not failed', async () => {
    revealFile.mockResolvedValue(ok({ path: '/downloads/illustrations', exists: false }));

    const result = await revealInFileManager({ type: 'illustration' });

    expect(result).toEqual({ outcome: 'missing', path: '/downloads/illustrations' });
    expect(revealFile).toHaveBeenCalledTimes(1);
  });

  it('copies the path when the environment has no file manager', async () => {
    revealFile
      .mockResolvedValueOnce(ok({ path: '/downloads/illustrations', exists: true }))
      .mockResolvedValueOnce(ok({ errorCode: 'FILE_REVEAL_UNSUPPORTED', path: '/downloads/illustrations' }));
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const result = await revealInFileManager({ type: 'illustration' });

    expect(writeText).toHaveBeenCalledWith('/downloads/illustrations');
    expect(result).toEqual({ outcome: 'copied', path: '/downloads/illustrations' });
  });

  it('still copies the resolved path when the backend answers unsupported as an error', async () => {
    revealFile
      .mockResolvedValueOnce(ok({ path: '/downloads/illustrations', exists: true }))
      .mockRejectedValueOnce(fail('FILE_REVEAL_UNSUPPORTED'));
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const result = await revealInFileManager({ type: 'illustration' });

    expect(result).toEqual({ outcome: 'copied', path: '/downloads/illustrations' });
  });

  it('fails when the backend cannot resolve the path at all', async () => {
    revealFile.mockRejectedValue(fail('FILE_PATH_INVALID'));

    const result = await revealInFileManager({ filePath: '/etc/hosts' });

    expect(result.outcome).toBe('failed');
    expect(revealFile).toHaveBeenCalledTimes(1);
  });

  it('fails when the backend resolves nothing', async () => {
    revealFile.mockResolvedValue(ok({}));

    const result = await revealInFileManager({ type: 'illustration' });

    expect(result).toEqual({ outcome: 'failed' });
  });
});
