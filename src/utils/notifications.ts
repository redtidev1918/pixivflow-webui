import type { HostNotification } from '../types/host-bridge';
import { canNotify, getHostCapabilities } from './hostCapabilities';

/**
 * Tell the user something happened, wherever they are.
 *
 * "The download finished" is only useful if it reaches the user when the tab is
 * not the thing they are looking at, and only the machine in front of them can
 * do that: the backend has no screen. So a host notification is preferred, and
 * the browser `Notification` API is the honest fallback for a plain browser
 * tab.
 *
 * Three outcomes, and a caller must be able to tell them apart:
 *
 *  - `shown` — a notification is on screen now;
 *  - `denied` — a channel exists but the user (or the OS) refused it;
 *  - `unavailable` — this runtime has no way to show one at all.
 *
 * There is deliberately no "best effort" success: reporting a notification that
 * nobody saw is worse than the silent nothing it replaced.
 *
 * The copy arrives ready to display. Localisation belongs to the caller because
 * the messages are this product's, and a host that received message keys would
 * have to grow a copy of every locale file.
 */

/** What happened to a notification. */
export type NotificationOutcome = 'shown' | 'denied' | 'unavailable';

export interface NotificationResult {
  outcome: NotificationOutcome;
  /** The error behind a failure, for logging and tests. */
  error?: unknown;
}

/**
 * Whether this runtime offers any notification channel at all.
 *
 * Use this before building UI that offers to notify; use `canNotifyNow()` when
 * the question is whether a notification sent right now would be seen.
 */
export function isNotificationChannelAvailable(): boolean {
  return canNotify();
}

/** Show a notification through the browser `Notification` API. */
async function notifyWithBrowser(notification: HostNotification): Promise<NotificationResult> {
  if (typeof Notification === 'undefined') {
    return { outcome: 'unavailable' };
  }

  try {
    let permission = Notification.permission;
    if (permission === 'default' && typeof Notification.requestPermission === 'function') {
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') {
      return { outcome: 'denied' };
    }

    new Notification(notification.title, { body: notification.body });
    return { outcome: 'shown' };
  } catch (error) {
    // A denied permission, a non-secure origin, or a platform that refuses to
    // construct one: all the same answer to the caller.
    return { outcome: 'denied', error };
  }
}

/**
 * Show a system notification on this machine.
 *
 * Prefers the desktop host; a browser tab falls back to its own notification
 * channel. Never throws — a notification that could not be shown is reported,
 * not raised, because every call site is fire-and-forget.
 */
export async function notifyUser(notification: HostNotification): Promise<NotificationResult> {
  const notify = getHostCapabilities().notify;
  if (notify) {
    try {
      const result = await notify(notification);
      if (result?.shown) return { outcome: 'shown' };
      return { outcome: result?.reason === 'denied' ? 'denied' : 'unavailable' };
    } catch (error) {
      return { outcome: 'unavailable', error };
    }
  }

  return notifyWithBrowser(notification);
}
