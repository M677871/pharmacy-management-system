import type {
  NotificationItem,
  NotificationSeverity,
  NotificationType,
} from '../../realtime/types/realtime.types';

export type NotificationFilter =
  | 'all'
  | 'unread'
  | 'priority'
  | 'calls'
  | 'meetings';

export function getNotificationToneLabel(severity: NotificationSeverity) {
  if (severity === 'critical') {
    return 'Critical';
  }

  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

export function getNotificationTypeLabel(type: NotificationType) {
  const labels: Record<NotificationType, string> = {
    broadcast: 'Broadcast',
    expiry_warning: 'Expiry',
    low_stock: 'Inventory',
    order: 'Order',
    out_of_stock: 'Inventory',
    system: 'System',
  };

  return labels[type] ?? 'Notification';
}

export function getNotificationInitial(notification: NotificationItem) {
  if (notification.title.toLowerCase().includes('meeting')) {
    return 'M';
  }

  if (notification.title.toLowerCase().includes('call')) {
    return 'C';
  }

  if (notification.type === 'low_stock' || notification.type === 'out_of_stock') {
    return 'I';
  }

  if (notification.type === 'expiry_warning') {
    return 'E';
  }

  return notification.title.charAt(0).toUpperCase();
}

export function getNotificationTargetPath(notification: NotificationItem) {
  const metadata = notification.metadata ?? {};
  const joinPath = metadata.joinPath;

  if (typeof joinPath === 'string' && joinPath.startsWith('/')) {
    return joinPath;
  }

  if (typeof metadata.meetingId === 'string') {
    return `/meetings/${metadata.meetingId}`;
  }

  if (typeof metadata.callId === 'string') {
    return '/messages';
  }

  if (notification.type === 'order') {
    return '/orders';
  }

  if (
    notification.type === 'low_stock' ||
    notification.type === 'out_of_stock' ||
    notification.type === 'expiry_warning'
  ) {
    return '/inventory';
  }

  if (notification.type === 'broadcast') {
    return '/messages';
  }

  return null;
}

export function filterNotifications(
  notifications: NotificationItem[],
  filter: NotificationFilter,
) {
  if (filter === 'unread') {
    return notifications.filter((notification) => !notification.isRead);
  }

  if (filter === 'priority') {
    return notifications.filter((notification) =>
      ['critical', 'warning'].includes(notification.severity),
    );
  }

  if (filter === 'calls') {
    return notifications.filter((notification) =>
      notification.title.toLowerCase().includes('call'),
    );
  }

  if (filter === 'meetings') {
    return notifications.filter((notification) =>
      notification.title.toLowerCase().includes('meeting'),
    );
  }

  return notifications;
}
