import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { renderHook } from '@testing-library/react';
import { message } from 'antd';
import { copyPath, revealInFileManager } from '../../utils/revealPath';
import { usePathActions } from '../../hooks/usePathActions';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { path?: string }) =>
      options?.path ? `${key}:${options.path}` : key,
  }),
}));

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

jest.mock('../../utils/revealPath', () => ({
  revealInFileManager: jest.fn(),
  copyPath: jest.fn(),
}));

const revealMock = revealInFileManager as jest.Mock;
const copyMock = copyPath as jest.Mock;

describe('usePathActions — one voice for every call site', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports a folder that is on screen', async () => {
    revealMock.mockResolvedValue({ outcome: 'revealed', path: '/downloads/a.jpg' });

    await renderHook(() => usePathActions()).result.current.reveal({ filePath: 'a.jpg' });

    expect(message.success).toHaveBeenCalledWith('reveal.opened:/downloads/a.jpg');
  });

  it('says the path was copied when this machine has no host', async () => {
    revealMock.mockResolvedValue({ outcome: 'copied', path: '/srv/downloads', reason: 'no-host' });

    await renderHook(() => usePathActions()).result.current.reveal({});

    expect(message.info).toHaveBeenCalledWith('reveal.copied:/srv/downloads');
  });

  it('distinguishes a path that is not on this machine from one that cannot be shown', async () => {
    revealMock.mockResolvedValue({ outcome: 'copied', path: '/srv/downloads', reason: 'missing' });

    await renderHook(() => usePathActions()).result.current.reveal({});

    expect(message.info).toHaveBeenCalledWith('reveal.missingPath:/srv/downloads');
    expect(message.info).not.toHaveBeenCalledWith('reveal.copied:/srv/downloads');
  });

  it('reports a failed reveal as an error', async () => {
    revealMock.mockResolvedValue({ outcome: 'failed' });

    await renderHook(() => usePathActions()).result.current.reveal({});

    expect(message.error).toHaveBeenCalledWith('reveal.failed');
  });

  it('confirms a copied path', async () => {
    copyMock.mockResolvedValue({ outcome: 'copied', path: '/downloads/a.jpg' });

    await renderHook(() => usePathActions()).result.current.copy({ filePath: 'a.jpg' });

    expect(message.success).toHaveBeenCalledWith('reveal.copiedPath:/downloads/a.jpg');
  });

  it('reports a failed copy as an error', async () => {
    copyMock.mockResolvedValue({ outcome: 'failed', reason: 'unavailable' });

    await renderHook(() => usePathActions()).result.current.copy({ filePath: 'a.jpg' });

    expect(message.error).toHaveBeenCalledWith('reveal.copyFailed');
  });
});
