/**
 * Covers `src/pages/Download/hooks/useDownloadCompletionNotice.tsx` — the
 * notice that tells a user their download finished and offers the folder
 * actions. Page-scoped hooks live beside their page, so the test does too.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { renderHook } from '@testing-library/react';
import { notification } from 'antd';
import {
  createCompletionTracker,
  newlyCompleted,
  useDownloadCompletionNotice,
} from '../../pages/Download/hooks/useDownloadCompletionNotice';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  return {
    ...actual,
    notification: {
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
      info: jest.fn(),
    },
  };
});

const successMock = notification.success as jest.Mock;

describe('newlyCompleted — history is not news', () => {
  it('stays quiet about the completed tasks it inherits on the first list', () => {
    const tracker = createCompletionTracker();

    expect(
      newlyCompleted(tracker, [
        { taskId: 'old-1', status: 'completed' },
        { taskId: 'old-2', status: 'failed' },
      ])
    ).toEqual([]);
    expect(tracker.hasSnapshot).toBe(true);
    expect(tracker.notified.has('old-1')).toBe(true);
  });

  it('announces a task it watched running', () => {
    const tracker = { hasSnapshot: true, notified: new Set<string>() };

    expect(
      newlyCompleted(tracker, [
        { taskId: 't1', status: 'running' },
        { taskId: 't2', status: 'completed' },
      ])
    ).toEqual(['t2']);
  });

  it('announces a task that finished between two lists', () => {
    const tracker = { hasSnapshot: true, notified: new Set<string>() };

    expect(newlyCompleted(tracker, [{ taskId: 't3', status: 'completed' }])).toEqual(['t3']);
  });

  it('announces each task once, however long it stays in the list', () => {
    const tracker = { hasSnapshot: true, notified: new Set<string>() };
    const tasks = [{ taskId: 't4', status: 'completed' }];

    expect(newlyCompleted(tracker, tasks)).toEqual(['t4']);
    expect(newlyCompleted(tracker, tasks)).toEqual([]);
  });

  it('reports every task that finished together', () => {
    const tracker = { hasSnapshot: true, notified: new Set<string>() };

    expect(
      newlyCompleted(tracker, [
        { taskId: 't5', status: 'completed' },
        { taskId: 't6', status: 'completed' },
        { taskId: 't7', status: 'running' },
      ])
    ).toEqual(['t5', 't6']);
  });

  it('ignores rows without an id and statuses that are not completion', () => {
    const tracker = { hasSnapshot: true, notified: new Set<string>() };

    expect(
      newlyCompleted(tracker, [
        { status: 'completed' },
        { taskId: 't8', status: 'failed' },
        { taskId: 't9', status: 'stopped' },
      ])
    ).toEqual([]);
  });
});

describe('useDownloadCompletionNotice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('notices a download that just finished, with the folder actions attached', () => {
    const { rerender } = renderHook(
      ({ tasks }: { tasks: { taskId: string; status: string }[] }) =>
        useDownloadCompletionNotice(tasks),
      { initialProps: { tasks: [{ taskId: 't1', status: 'running' }] } }
    );

    expect(successMock).not.toHaveBeenCalled();

    rerender({ tasks: [{ taskId: 't1', status: 'completed' }] });

    expect(successMock).toHaveBeenCalledTimes(1);
    const notice = successMock.mock.calls[0][0] as {
      key: string;
      message: string;
      duration: number;
    };
    expect(notice.key).toBe('download-completed-t1');
    expect(notice.message).toBe('download.completed');
    expect(notice.duration).toBe(8);
  });

  it('does not announce the history the page loads with', () => {
    renderHook(() => useDownloadCompletionNotice([{ taskId: 'old-1', status: 'completed' }]));

    expect(successMock).not.toHaveBeenCalled();
  });
});
