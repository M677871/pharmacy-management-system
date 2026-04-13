export const REALTIME_NAMESPACE = '/realtime';

export const realtimeEvent = {
  systemConnected: 'system.connected',
  presenceSnapshot: 'presence.snapshot',
  presenceChanged: 'presence.changed',
  inventoryChanged: 'inventory.changed',
  analyticsRefresh: 'analytics.refresh',
  usersChanged: 'users.changed',
  notificationCreated: 'notification.created',
  notificationUpdated: 'notification.updated',
  notificationsReadAll: 'notifications.readAll',
  chatMessageCreated: 'chat.message.created',
  chatMessageUpdated: 'chat.message.updated',
  chatMessageDeleted: 'chat.message.deleted',
  chatThreadRead: 'chat.thread.read',
  broadcastCreated: 'broadcast.created',
} as const;

export const realtimeClientEvent = {
  presencePing: 'presence.ping',
  notificationMarkRead: 'notification.markRead',
  notificationMarkAllRead: 'notification.markAllRead',
  chatSend: 'chat.send',
  chatUpdate: 'chat.update',
  chatDelete: 'chat.delete',
  chatMarkThreadRead: 'chat.markThreadRead',
  broadcastSend: 'broadcast.send',
} as const;

export type UserRole = 'admin' | 'employee' | 'customer';
export type PresenceStatus = 'active' | 'online' | 'offline';
export type NotificationType =
  | 'low_stock'
  | 'out_of_stock'
  | 'expiry_warning'
  | 'broadcast'
  | 'system';
export type NotificationSeverity = 'info' | 'warning' | 'critical' | 'success';

export interface RealtimeUserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: UserRole;
}

export interface PresenceEntry {
  userId: string;
  displayName: string;
  role: UserRole;
  status: PresenceStatus;
  connectionCount: number;
  lastActiveAt: string | null;
  lastSeenAt: string | null;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  body: string;
  metadata: Record<string, unknown> | null;
  dedupeKey: string | null;
  isRead: boolean;
  readAt: string | null;
  isResolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
}

export interface NotificationsReadAllPayload {
  notificationIds: string[];
  readAt: string;
}

export interface DirectMessage {
  id: string;
  body: string;
  senderId: string;
  recipientId: string;
  readAt: string | null;
  createdAt: string;
  sender: RealtimeUserSummary;
  recipient: RealtimeUserSummary;
}

export interface ChatThreadSummary {
  contact: RealtimeUserSummary;
  lastMessage: DirectMessage;
  unreadCount: number;
  isClosed: boolean;
  closedAt: string | null;
}

export interface ChatThreadReadPayload {
  contactId: string;
  userId: string;
  readAt: string;
  messageIds: string[];
}

export interface ConversationVisibility {
  contactId: string;
  isClosed: boolean;
  closedAt: string | null;
}

export interface BroadcastMessage {
  id: string;
  title: string;
  body: string;
  audienceRoles: UserRole[];
  sender: RealtimeUserSummary;
  createdAt: string;
}

export type InventoryChangeReason =
  | 'product.created'
  | 'product.updated'
  | 'product.deleted'
  | 'batch.updated'
  | 'category.created'
  | 'category.updated'
  | 'category.deleted'
  | 'supplier.created'
  | 'supplier.updated'
  | 'supplier.deleted'
  | 'purchase.received'
  | 'sale.completed'
  | 'return.completed';

export interface InventoryChangedEvent {
  reason: InventoryChangeReason;
  productIds: string[];
  batchIds: string[];
  relatedEntityId: string | null;
  actorUserId: string | null;
  occurredAt: string;
}

export interface AnalyticsRefreshEvent {
  scope: 'inventory' | 'catalog' | 'purchases' | 'sales' | 'returns' | 'users';
  reason: InventoryChangeReason | 'user.created';
  occurredAt: string;
}

export interface UsersChangedEvent {
  reason: 'user.created';
  userId: string;
  occurredAt: string;
}

export interface RealtimeEventMap {
  [realtimeEvent.presenceSnapshot]: PresenceEntry[];
  [realtimeEvent.presenceChanged]: PresenceEntry;
  [realtimeEvent.inventoryChanged]: InventoryChangedEvent;
  [realtimeEvent.analyticsRefresh]: AnalyticsRefreshEvent;
  [realtimeEvent.usersChanged]: UsersChangedEvent;
  [realtimeEvent.notificationCreated]: NotificationItem;
  [realtimeEvent.notificationUpdated]: NotificationItem;
  [realtimeEvent.notificationsReadAll]: NotificationsReadAllPayload;
  [realtimeEvent.chatMessageCreated]: DirectMessage;
  [realtimeEvent.chatMessageUpdated]: DirectMessage;
  [realtimeEvent.chatMessageDeleted]: DirectMessage;
  [realtimeEvent.chatThreadRead]: ChatThreadReadPayload;
  [realtimeEvent.broadcastCreated]: BroadcastMessage;
}

export interface RealtimeToast {
  id: string;
  tone: NotificationSeverity | 'message';
  title: string;
  body: string;
}
