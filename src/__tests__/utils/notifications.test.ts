/**
 * Tests for the notification channel.
 *
 * The point of these is the honest three-way answer: `shown`, `denied`,
 * `unavailable`. A caller that cannot tell them apart reports a notification
 * the user never saw.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

jest.mock('../../utils/hostCapabilities', () => ({
  getHostCapabilities: jest.fn(() => ({})),
  // Mirrors the real predicate: the host channel exists, or the browser has one.
  canNotify: jest.fn(
    () =>
      typeof (getHostCapabilities() as { notify?: unknown }).notify === 'function' ||
      typeof (globalThis as { Notification?: unknown }).Notification !== 'undefined'
  ),
}));

import { getHostCapabilities } from '../../utils/hostCapabilities';
import { notifyUser, isNotificationChannelAvailable } from '../../utils/notifications';

const mockedGetHostCapabilities = getHostCapabilities as jest.MockedFunction<
  typeof getHostCapabilities
>;

const globalWithNotification = globalThis as { Notification?: unknown };
const originalNotification = globalWithNotification.Notification;

interface FakeNotificationInstance {
  title: string;
  options?: { body?: unknown };
}

/** Install a fake browser `Notification` with a chosen permission. */
function withBrowserNotifications(permission: NotificationPermission = 'granted') {
  const instances: FakeNotificationInstance[] = [];
  const requestPermission = jest.fn(async () => permission);
  class FakeNotification {
    static permission: NotificationPermission = permission;
    static requestPermission = requestPermission;
    constructor(
      public title: string,
      public options?: { body?: unknown }
    ) {
      instances.push({ title, options });
    }
  }
  globalWithNotification.Notification = FakeNotification;
  return { instances, requestPermission };
}

const notification = { title: 'Download complete', body: 'work.jpg' };

describe('notifyUser — prefers the host, falls back to the browser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetHostCapabilities.mockReturnValue({});
  });

  afterEach(() => {
    globalWithNotification.Notification = originalNotification;
  });

  it('reports unavailable when there is no channel at all', async () => {
    await expect(notifyUser(notification)).resolves.toEqual({ outcome: 'unavailable' });
  });

  it('sends through the host when the host provides notify', async () => {
    const notify = jest.fn(async () => ({ shown: true } as const));
    mockedGetHostCapabilities.mockReturnValue({ notify });

    await expect(notifyUser(notification)).resolves.toEqual({ outcome: 'shown' });
    expect(notify).toHaveBeenCalledWith(notification);
  });

  it('reports denied when the host refuses the notification', async () => {
    const notify = jest.fn(async () => ({ shown: false, reason: 'denied' } as const));
    mockedGetHostCapabilities.mockReturnValue({ notify });

    await expect(notifyUser(notification)).resolves.toEqual({ outcome: 'denied' });
  });

  it('reports unavailable when the host answers without showing anything', async () => {
    const notify = jest.fn(async () => ({ shown: false } as const));
    mockedGetHostCapabilities.mockReturnValue({ notify });

    await expect(notifyUser(notification)).resolves.toEqual({ outcome: 'unavailable' });
  });

  it('never throws when the host notification fails', async () => {
    const notify = jest.fn(async () => {
      throw new Error('host exploded');
    });
    mockedGetHostCapabilities.mockReturnValue({ notify });

    const result = await notifyUser(notification);

    expect(result.outcome).toBe('unavailable');
    expect(result.error).toBeInstanceOf(Error);
  });

  it('falls back to the browser channel without a host', async () => {
    const { instances } = withBrowserNotifications('granted');

    await expect(notifyUser(notification)).resolves.toEqual({ outcome: 'shown' });
    expect(instances).toEqual([{ title: notification.title, options: { body: notification.body } }]);
  });

  it('asks for permission and reports denied when the browser refuses', async () => {
    const { instances, requestPermission } = withBrowserNotifications('default');
    const FakeNotification = globalWithNotification.Notification as {
      permission: NotificationPermission;
      requestPermission: jest.Mock;
    };
    FakeNotification.requestPermission = jest.fn(async () => 'denied');

    const result = await notifyUser(notification);

    expect(requestPermission).not.toHaveBeenCalled();
    expect(FakeNotification.requestPermission).toHaveBeenCalled();
    expect(result.outcome).toBe('denied');
    expect(instances).toHaveLength(0);
  });

  it('reports denied when the browser throws while constructing one', async () => {
    globalWithNotification.Notification = class {
      static permission: NotificationPermission = 'granted';
      constructor() {
        throw new Error('not allowed');
      }
    };

    const result = await notifyUser(notification);

    expect(result.outcome).toBe('denied');
    expect(result.error).toBeInstanceOf(Error);
  });
});

describe('isNotificationChannelAvailable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetHostCapabilities.mockReturnValue({});
  });

  afterEach(() => {
    globalWithNotification.Notification = originalNotification;
  });

  it('is false with neither a host nor a browser channel', () => {
    expect(isNotificationChannelAvailable()).toBe(false);
  });

  it('is true as soon as a browser channel exists, permission aside', () => {
    withBrowserNotifications('default');

    expect(isNotificationChannelAvailable()).toBe(true);
  });
});
