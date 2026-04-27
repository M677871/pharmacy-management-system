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

export type CallTypeValue = 'voice' | 'video';
export type CallStatusValue =
  | 'ringing'
  | 'connecting'
  | 'active'
  | 'ended'
  | 'missed'
  | 'rejected'
  | 'failed';

export interface CallParticipantPayload {
  id: string;
  callId: string;
  userId: string;
  role: 'caller' | 'receiver';
  joinedAt: string | null;
  leftAt: string | null;
  microphoneMuted: boolean;
  cameraEnabled: boolean;
  user: RealtimeUserSummary;
}

export interface CallSessionPayload {
  id: string;
  type: CallTypeValue;
  status: CallStatusValue;
  callerId: string;
  receiverId: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number;
  endedReason: string | null;
  createdAt: string;
  updatedAt: string;
  caller: RealtimeUserSummary;
  receiver: RealtimeUserSummary;
  participants: CallParticipantPayload[];
}

export interface CallLifecyclePayload {
  callId: string;
  status: CallStatusValue;
  reason: 'accepted' | 'rejected' | 'ended' | 'missed' | 'failed';
  occurredAt: string;
}

export interface RtcSignalPayload {
  callId?: string;
  meetingId?: string;
  fromUserId: string;
  targetUserId?: string | null;
  type:
    | 'offer'
    | 'answer'
    | 'ice-candidate'
    | 'screen-share-started'
    | 'screen-share-stopped';
  payload: Record<string, unknown>;
  clientRequestId: string | null;
  occurredAt: string;
}

export interface RecordingPayload {
  id: string;
  callId?: string;
  meetingId?: string;
  createdById: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  mimeType: string | null;
  sizeBytes: number;
  hasFile: boolean;
  downloadUrl: string | null;
  createdAt: string;
}

export type MeetingStateValue = 'scheduled' | 'live' | 'ended' | 'cancelled';

export interface MeetingParticipantPayload {
  id: string;
  meetingId: string;
  userId: string;
  role: 'host' | 'invitee';
  status: 'invited' | 'accepted' | 'declined' | 'joined' | 'left';
  joinedAt: string | null;
  leftAt: string | null;
  user: RealtimeUserSummary;
}

export interface MeetingPayload {
  id: string;
  title: string;
  agenda: string | null;
  scheduledStartAt: string;
  durationMinutes: number;
  state: MeetingStateValue;
  hostId: string;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  joinPath: string;
  host: RealtimeUserSummary;
  participants: MeetingParticipantPayload[];
}

export interface MeetingParticipantUpdatedPayload {
  meetingId: string;
  user: RealtimeUserSummary;
  action: 'joined' | 'left';
  occurredAt: string;
}

export interface MeetingNotePayload {
  id: string;
  meetingId: string;
  authorId: string;
  author: RealtimeUserSummary;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptSegmentPayload {
  id: string;
  sessionType: 'call' | 'meeting';
  sessionId: string;
  authorId: string;
  author: RealtimeUserSummary;
  text: string;
  sourceLanguage: string | null;
  targetLanguage: string | null;
  translatedText: string | null;
  translationStatus: 'not_requested' | 'translated' | 'disabled' | 'failed';
  translationProvider: string | null;
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
