import { useEffect, useRef } from 'react';
import { Space, notification } from 'antd';
import { useTranslation } from 'react-i18next';
import { CopyPathButton, RevealPathButton } from '../../../components/common';
import { isNotificationChannelAvailable, notifyUser } from '../../../utils/notifications';

/**
 * "That download is done" — and a way to reach the files from where the user
 * is looking.
 *
 * A finished task only matters if the user can act on it, and the moment they
 * learn about it is the moment the work is on disk. The notice therefore
 * carries the two actions every other download surface carries
 * (`RevealPathButton` / `CopyPathButton`), so a desktop user opens the folder
 * and a server user copies the path — the same three outcomes, reported the
 * same way, without this hook owning any of that logic.
 *
 * It reveals the *download directory*, not one file: a task writes as many
 * files as the run produced, so naming one of them would be a lie.
 *
 * The hook lives on the download page on purpose — that is where a download is
 * watched, and it is where the task list already arrives every couple of
 * seconds. Moving this to the app shell would be a separate decision.
 */

/** The part of a download task row this hook reads. */
export interface DownloadTaskLike {
  taskId?: string;
  status?: string;
}

/** What the hook remembers between renders. */
export interface CompletionTracker {
  /** False until the first task list has been seen. */
  hasSnapshot: boolean;
  /** Task ids already announced, or deliberately skipped. */
  notified: Set<string>;
}

export function createCompletionTracker(): CompletionTracker {
  return { hasSnapshot: false, notified: new Set() };
}

/**
 * Which tasks in this list just finished, updating the tracker in place.
 *
 * The first list is *history*: every download that ever completed, merged from
 * the database. Announcing those would be noise about work the user already
 * knows about, so they are marked as seen instead. After that, any completed
 * task that has not been announced is news — whether it was watched running or
 * finished between two polls.
 */
export function newlyCompleted(
  tracker: CompletionTracker,
  tasks: readonly DownloadTaskLike[]
): string[] {
  const completed: string[] = [];
  for (const task of tasks) {
    if (task.taskId && task.status === 'completed') completed.push(task.taskId);
  }

  if (!tracker.hasSnapshot) {
    for (const taskId of completed) tracker.notified.add(taskId);
    tracker.hasSnapshot = true;
    return [];
  }

  const fresh: string[] = [];
  for (const taskId of completed) {
    if (tracker.notified.has(taskId)) continue;
    tracker.notified.add(taskId);
    fresh.push(taskId);
  }
  return fresh;
}

/**
 * Announce every download that finished since the previous list.
 *
 * The in-app notice is the primary channel when the tab is in front of the
 * user. When it is not, an antd banner lives in a tab nobody is looking at, so
 * the completion goes to the system notification channel instead — the host's
 * if the desktop host provides one, otherwise the browser's own. That is the
 * only reason this hook needs the capability layer at all.
 */
export function useDownloadCompletionNotice(tasks: readonly DownloadTaskLike[]): void {
  const { t } = useTranslation();
  const tracker = useRef<CompletionTracker>(createCompletionTracker());

  useEffect(() => {
    const finished = newlyCompleted(tracker.current, tasks);
    if (finished.length === 0) return;

    // A system notification is worth attempting only when the page is hidden
    // and this runtime has a channel to show it on.
    const hidden =
      typeof document !== 'undefined' && document.visibilityState === 'hidden';
    const systemNotify = hidden && isNotificationChannelAvailable();

    for (const taskId of finished) {
      if (systemNotify) {
        // Fire and forget: the in-app notice below is not contingent on it, and
        // a refused notification must not break the download page.
        void notifyUser({
          title: t('download.completed'),
          body: t('download.completedBody'),
          level: 'success',
        });
      }

      notification.success({
        key: `download-completed-${taskId}`,
        message: t('download.completed'),
        description: (
          <Space direction="vertical" size={4}>
            <span>{t('download.completionNotice')}</span>
            <Space size={4}>
              <RevealPathButton label={t('reveal.openDownloadDir')} />
              <CopyPathButton />
            </Space>
          </Space>
        ),
        duration: 8,
      });
    }
  }, [tasks, t]);
}
