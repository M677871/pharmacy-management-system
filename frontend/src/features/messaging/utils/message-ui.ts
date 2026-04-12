import type {
  BroadcastMessage,
  ChatThreadSummary,
  DirectMessage,
  MessagingContact,
} from '../types/messaging.types';
import type {
  PresenceEntry,
  PresenceStatus,
} from '../../realtime/types/realtime.types';
import { formatDateShort, formatDateTime } from '../../../shared/utils/format';

export type PresenceTone = 'online' | 'offline';

export interface ConversationItem {
  contact: MessagingContact;
  summary: ChatThreadSummary | null;
  preview: string;
  timestampLabel: string;
  unreadCount: number;
  presence: PresenceEntry | undefined;
  presenceLabel: string;
  presenceTone: PresenceTone;
}

export interface MessageCluster {
  id: string;
  sender: MessagingContact;
  senderId: string;
  startedAt: string;
  showDateDivider: boolean;
  dateLabel: string;
  isOutgoing: boolean;
  messages: DirectMessage[];
}

export function upsertThreadSummary(
  summaries: ChatThreadSummary[],
  nextSummary: ChatThreadSummary,
) {
  const remaining = summaries.filter(
    (summary) => summary.contact.id !== nextSummary.contact.id,
  );

  return [nextSummary, ...remaining].sort((left, right) =>
    right.lastMessage.createdAt.localeCompare(left.lastMessage.createdAt),
  );
}

export function formatMessageClock(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatConversationTimestamp(value: string) {
  const date = new Date(value);
  const now = new Date();
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isSameDay) {
    return formatMessageClock(value);
  }

  return formatDateShort(value);
}

export function getPresenceLabel(status?: PresenceStatus) {
  if (status === 'active') {
    return 'Active';
  }

  if (status === 'online') {
    return 'Online';
  }

  return 'Offline';
}

export function getPresenceTone(status?: PresenceStatus): PresenceTone {
  return status === 'active' || status === 'online' ? 'online' : 'offline';
}

export function getPresenceMeta(entry?: PresenceEntry) {
  if (!entry) {
    return 'Offline';
  }

  if (entry.status === 'active') {
    return 'Active now';
  }

  if (entry.status === 'online') {
    return 'Online';
  }

  if (entry.lastSeenAt) {
    return `Last seen ${formatConversationTimestamp(entry.lastSeenAt)}`;
  }

  return 'Offline';
}

export function buildPreview(summary?: ChatThreadSummary | null, currentUserId?: string) {
  if (!summary) {
    return 'No messages yet. Start the conversation.';
  }

  const prefix = summary.lastMessage.senderId === currentUserId ? 'You: ' : '';
  return `${prefix}${summary.lastMessage.body}`.slice(0, 96);
}

export function buildConversationItems(params: {
  contacts: MessagingContact[];
  currentUserId?: string;
  presenceByUserId: Record<string, PresenceEntry>;
  threadSummaries: ChatThreadSummary[];
}) {
  const { contacts, currentUserId, presenceByUserId, threadSummaries } = params;
  const summaryByContactId = new Map(
    threadSummaries.map((summary) => [summary.contact.id, summary]),
  );
  const threadContacts = threadSummaries.map((summary) => summary.contact);
  const directoryOnlyContacts = contacts
    .filter((contact) => !summaryByContactId.has(contact.id))
    .sort((left, right) => left.displayName.localeCompare(right.displayName));

  return [...threadContacts, ...directoryOnlyContacts].map((contact) => {
    const summary = summaryByContactId.get(contact.id) ?? null;
    const presence = presenceByUserId[contact.id];

    return {
      contact,
      summary,
      preview: buildPreview(summary, currentUserId),
      timestampLabel: summary
        ? formatConversationTimestamp(summary.lastMessage.createdAt)
        : 'New',
      unreadCount: summary?.unreadCount ?? 0,
      presence,
      presenceLabel: getPresenceLabel(presence?.status),
      presenceTone: getPresenceTone(presence?.status),
    } satisfies ConversationItem;
  });
}

export function buildAvailabilityItems(conversations: ConversationItem[]) {
  return [...conversations].sort((left, right) => {
    if (left.presenceTone !== right.presenceTone) {
      return left.presenceTone === 'online' ? -1 : 1;
    }

    if (right.unreadCount !== left.unreadCount) {
      return right.unreadCount - left.unreadCount;
    }

    return left.contact.displayName.localeCompare(right.contact.displayName);
  });
}

export function buildMessageClusters(
  messages: DirectMessage[],
  currentUserId?: string,
) {
  const clusters: MessageCluster[] = [];
  let lastDateLabel = '';

  for (const message of messages) {
    const dateLabel = formatDateShort(message.createdAt);
    const previousCluster = clusters[clusters.length - 1];
    const showDateDivider = dateLabel !== lastDateLabel;
    const canMerge =
      previousCluster &&
      !showDateDivider &&
      previousCluster.senderId === message.senderId &&
      new Date(message.createdAt).getTime() -
        new Date(
          previousCluster.messages[previousCluster.messages.length - 1].createdAt,
        ).getTime() <
        300_000;

    if (canMerge) {
      previousCluster.messages.push(message);
      lastDateLabel = dateLabel;
      continue;
    }

    clusters.push({
      id: message.id,
      sender: message.sender,
      senderId: message.senderId,
      startedAt: message.createdAt,
      showDateDivider,
      dateLabel,
      isOutgoing: message.senderId === currentUserId,
      messages: [message],
    });

    lastDateLabel = dateLabel;
  }

  return clusters;
}

export function getThreadReadSummary(
  messages: DirectMessage[],
  currentUserId?: string,
) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message.senderId !== currentUserId) {
      continue;
    }

    return message.readAt
      ? `Seen ${formatConversationTimestamp(message.readAt)}`
      : 'Delivered';
  }

  return null;
}

export function getLastMessageTimestamp(
  summary?: ChatThreadSummary | null,
  fallback?: BroadcastMessage | null,
) {
  if (summary) {
    return formatDateTime(summary.lastMessage.createdAt);
  }

  if (fallback) {
    return formatDateTime(fallback.createdAt);
  }

  return 'No recent activity';
}
