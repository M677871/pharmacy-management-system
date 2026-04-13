import { UserRole } from '../users/entities/user.entity';

export const REALTIME_NAMESPACE = '/realtime';

export const realtimeRoom = {
  user: (userId: string) => `user:${userId}`,
  role: (role: UserRole) => `role:${role}`,
};

export enum RealtimeServerEvent {
  SYSTEM_CONNECTED = 'system.connected',
  PRESENCE_SNAPSHOT = 'presence.snapshot',
  PRESENCE_CHANGED = 'presence.changed',
  INVENTORY_CHANGED = 'inventory.changed',
  ANALYTICS_REFRESH = 'analytics.refresh',
  USERS_CHANGED = 'users.changed',
  NOTIFICATION_CREATED = 'notification.created',
  NOTIFICATION_UPDATED = 'notification.updated',
  NOTIFICATIONS_READ_ALL = 'notifications.readAll',
  CHAT_MESSAGE_CREATED = 'chat.message.created',
  CHAT_MESSAGE_UPDATED = 'chat.message.updated',
  CHAT_MESSAGE_DELETED = 'chat.message.deleted',
  CHAT_THREAD_READ = 'chat.thread.read',
  BROADCAST_CREATED = 'broadcast.created',
}

export enum RealtimeClientEvent {
  PRESENCE_PING = 'presence.ping',
  NOTIFICATION_MARK_READ = 'notification.markRead',
  NOTIFICATIONS_MARK_ALL_READ = 'notification.markAllRead',
  CHAT_SEND = 'chat.send',
  CHAT_UPDATE = 'chat.update',
  CHAT_DELETE = 'chat.delete',
  CHAT_MARK_THREAD_READ = 'chat.markThreadRead',
  BROADCAST_SEND = 'broadcast.send',
}
