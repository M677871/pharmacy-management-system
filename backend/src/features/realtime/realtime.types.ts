import {
  NotificationSeverity,
  NotificationType,
} from '../notifications/entities/notification.entity';
import { UserRole } from '../users/entities/user.entity';

export type PresenceStatus = 'active' | 'online' | 'offline';

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

export type AnalyticsRefreshScope =
  | 'inventory'
  | 'catalog'
  | 'purchases'
  | 'sales'
  | 'returns'
  | 'users';

export interface InventoryChangedPayload {
  reason: InventoryChangeReason;
  productIds: string[];
  batchIds: string[];
  relatedEntityId: string | null;
  actorUserId: string | null;
  occurredAt: string;
}

export interface AnalyticsRefreshPayload {
  scope: AnalyticsRefreshScope;
  reason: InventoryChangeReason | 'user.created';
  occurredAt: string;
}

export interface UsersChangedPayload {
  reason: 'user.created';
  userId: string;
  occurredAt: string;
}

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

export interface NotificationPayload {
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

export interface ChatMessagePayload {
  id: string;
  body: string;
  senderId: string;
  recipientId: string;
  readAt: string | null;
  createdAt: string;
  sender: RealtimeUserSummary;
  recipient: RealtimeUserSummary;
}

export interface ChatThreadSummaryPayload {
  contact: RealtimeUserSummary;
  lastMessage: ChatMessagePayload;
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

export interface BroadcastPayload {
  id: string;
  title: string;
  body: string;
  audienceRoles: UserRole[];
  sender: RealtimeUserSummary;
  createdAt: string;
}
