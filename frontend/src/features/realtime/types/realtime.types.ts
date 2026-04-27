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
  orderCreated: 'order.created',
  orderUpdated: 'order.updated',
  callIncoming: 'call.incoming',
  callUpdated: 'call.updated',
  callLifecycle: 'call.lifecycle',
  callSignal: 'call.signal',
  callRecordingCreated: 'call.recording.created',
  meetingUpdated: 'meeting.updated',
  meetingParticipantUpdated: 'meeting.participant.updated',
  meetingSignal: 'meeting.signal',
  meetingNoteCreated: 'meeting.note.created',
  meetingNoteUpdated: 'meeting.note.updated',
  meetingRecordingCreated: 'meeting.recording.created',
  captionSegmentCreated: 'caption.segment.created',
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
  callStart: 'call.start',
  callAccept: 'call.accept',
  callReject: 'call.reject',
  callEnd: 'call.end',
  callFail: 'call.fail',
  callSignal: 'call.signal',
  meetingJoin: 'meeting.join',
  meetingLeave: 'meeting.leave',
  meetingSignal: 'meeting.signal',
} as const;

export type UserRole = 'admin' | 'employee' | 'customer';
export type PresenceStatus = 'active' | 'online' | 'offline';
export type NotificationType =
  | 'low_stock'
  | 'out_of_stock'
  | 'expiry_warning'
  | 'broadcast'
  | 'order'
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

export type CallType = 'voice' | 'video';
export type CallStatus =
  | 'ringing'
  | 'connecting'
  | 'active'
  | 'ended'
  | 'missed'
  | 'rejected'
  | 'failed';

export interface CallParticipant {
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

export interface CallSession {
  id: string;
  type: CallType;
  status: CallStatus;
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
  participants: CallParticipant[];
}

export interface CallLifecycleEvent {
  callId: string;
  status: CallStatus;
  reason: 'accepted' | 'rejected' | 'ended' | 'missed' | 'failed';
  occurredAt: string;
}

export interface RtcSignalEvent {
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

export interface RecordingItem {
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

export type MeetingState = 'scheduled' | 'live' | 'ended' | 'cancelled';

export interface MeetingParticipant {
  id: string;
  meetingId: string;
  userId: string;
  role: 'host' | 'invitee';
  status: 'invited' | 'accepted' | 'declined' | 'joined' | 'left';
  joinedAt: string | null;
  leftAt: string | null;
  user: RealtimeUserSummary;
}

export interface Meeting {
  id: string;
  title: string;
  agenda: string | null;
  scheduledStartAt: string;
  durationMinutes: number;
  state: MeetingState;
  hostId: string;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  joinPath: string;
  host: RealtimeUserSummary;
  participants: MeetingParticipant[];
}

export interface MeetingParticipantUpdatedEvent {
  meetingId: string;
  user: RealtimeUserSummary;
  action: 'joined' | 'left';
  occurredAt: string;
}

export interface MeetingNote {
  id: string;
  meetingId: string;
  authorId: string;
  author: RealtimeUserSummary;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaptionSegment {
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

export type OrderStatus =
  | 'pending_assignment'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'completed';

export interface DeliveryDriver {
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

export interface OrderItemAllocation {
  id: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  allocations: OrderItemAllocation[];
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  notes: string | null;
  approvalMessage: string | null;
  rejectionReason: string | null;
  paymentMethod: 'cash' | null;
  totalAmount: number;
  saleId: string | null;
  itemCount: number;
  client: RealtimeUserSummary;
  assignedEmployee: RealtimeUserSummary | null;
  deliveryDriver: DeliveryDriver | null;
  items: OrderItem[];
  createdAt: string;
  assignedAt: string | null;
  reviewedAt: string | null;
  locationSharedAt: string | null;
  paidAt: string | null;
  updatedAt: string;
}

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
  [realtimeEvent.orderCreated]: OrderRecord;
  [realtimeEvent.orderUpdated]: OrderRecord;
  [realtimeEvent.callIncoming]: CallSession;
  [realtimeEvent.callUpdated]: CallSession;
  [realtimeEvent.callLifecycle]: CallLifecycleEvent;
  [realtimeEvent.callSignal]: RtcSignalEvent;
  [realtimeEvent.callRecordingCreated]: RecordingItem;
  [realtimeEvent.meetingUpdated]: Meeting;
  [realtimeEvent.meetingParticipantUpdated]: MeetingParticipantUpdatedEvent;
  [realtimeEvent.meetingSignal]: RtcSignalEvent;
  [realtimeEvent.meetingNoteCreated]: MeetingNote;
  [realtimeEvent.meetingNoteUpdated]: MeetingNote;
  [realtimeEvent.meetingRecordingCreated]: RecordingItem;
  [realtimeEvent.captionSegmentCreated]: CaptionSegment;
}

export interface RealtimeToast {
  id: string;
  tone: NotificationSeverity | 'message';
  title: string;
  body: string;
}
