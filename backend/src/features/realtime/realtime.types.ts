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
  | 'order.approved'
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

export type OrderStatusValue =
  | 'pending_assignment'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'completed';

export interface DeliveryDriverPayload {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  vehicleDescription: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItemAllocationPayload {
  id: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
}

export interface OrderItemPayload {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  allocations: OrderItemAllocationPayload[];
}

export interface OrderPayload {
  id: string;
  orderNumber: string;
  status: OrderStatusValue;
  notes: string | null;
  approvalMessage: string | null;
  rejectionReason: string | null;
  paymentMethod: 'cash' | null;
  totalAmount: number;
  saleId: string | null;
  itemCount: number;
  client: RealtimeUserSummary;
  assignedEmployee: RealtimeUserSummary | null;
  deliveryDriver: DeliveryDriverPayload | null;
  items: OrderItemPayload[];
  createdAt: string;
  assignedAt: string | null;
  reviewedAt: string | null;
  locationSharedAt: string | null;
  paidAt: string | null;
  updatedAt: string;
}
