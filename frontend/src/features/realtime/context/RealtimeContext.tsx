import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import { notificationsService } from '../../notifications/services/notifications.service';
import { useAuth } from '../../auth/hooks/useAuth';
import { messagesService } from '../../messaging/services/messages.service';
import { SOCKET_URL } from '../../../shared/api/axios';
import {
  REALTIME_NAMESPACE,
  realtimeClientEvent,
  realtimeEvent,
  type BroadcastMessage,
  type CallSession,
  type ChatThreadSummary,
  type ChatThreadReadPayload,
  type DirectMessage,
  type Meeting,
  type NotificationItem,
  type NotificationsReadAllPayload,
  type OrderRecord,
  type PresenceEntry,
  type RtcSignalEvent,
  type RealtimeEventMap,
  type RealtimeToast,
  type UserRole,
} from '../types/realtime.types';

type ConnectionState = 'disconnected' | 'connecting' | 'connected';

interface RealtimeContextValue {
  connectionState: ConnectionState;
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  unreadMessagingCount: number;
  broadcasts: BroadcastMessage[];
  presenceByUserId: Record<string, PresenceEntry>;
  activeCall: CallSession | null;
  toasts: RealtimeToast[];
  setActiveCall: (call: CallSession | null) => void;
  dismissActiveCall: () => void;
  dismissToast: (toastId: string) => void;
  refreshNotifications: () => Promise<void>;
  refreshBroadcasts: () => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  sendDirectMessage: (payload: {
    recipientId: string;
    body: string;
  }) => Promise<DirectMessage>;
  updateDirectMessage: (payload: {
    messageId: string;
    body: string;
  }) => Promise<DirectMessage>;
  deleteDirectMessage: (payload: { messageId: string }) => Promise<DirectMessage>;
  markThreadRead: (contactId: string) => Promise<ChatThreadReadPayload>;
  sendBroadcast: (payload: {
    title: string;
    body: string;
    audienceRoles?: UserRole[];
  }) => Promise<BroadcastMessage>;
  startCall: (payload: {
    recipientId: string;
    type: 'voice' | 'video';
  }) => Promise<CallSession>;
  acceptCall: (callId: string) => Promise<CallSession>;
  rejectCall: (callId: string) => Promise<CallSession>;
  endCall: (callId: string) => Promise<CallSession>;
  failCall: (callId: string) => Promise<CallSession>;
  sendCallSignal: (payload: {
    callId: string;
    type: RtcSignalEvent['type'];
    payload: Record<string, unknown>;
    clientRequestId?: string;
  }) => Promise<{ ok: true }>;
  joinMeeting: (meetingId: string) => Promise<Meeting>;
  leaveMeeting: (meetingId: string) => Promise<Meeting>;
  sendMeetingSignal: (payload: {
    meetingId: string;
    targetUserId?: string;
    type: RtcSignalEvent['type'];
    payload: Record<string, unknown>;
    clientRequestId?: string;
  }) => Promise<{ ok: true }>;
  subscribe: <TEvent extends keyof RealtimeEventMap>(
    event: TEvent,
    listener: (payload: RealtimeEventMap[TEvent]) => void,
  ) => () => void;
}

export const RealtimeContext = createContext<RealtimeContextValue>(
  {} as RealtimeContextValue,
);

type RealtimeListenerMap = {
  [TEvent in keyof RealtimeEventMap]?: Set<
    (payload: RealtimeEventMap[keyof RealtimeEventMap]) => void
  >;
};

function createToast(
  tone: RealtimeToast['tone'],
  title: string,
  body: string,
): RealtimeToast {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tone,
    title,
    body,
  };
}

function getBroadcastSeenStorageKey(userId: string) {
  return `messages.lastSeenBroadcastAt:${userId}`;
}

function getLatestBroadcastTimestamp(broadcasts: BroadcastMessage[]) {
  return broadcasts.reduce<number>((latest, broadcast) => {
    const timestamp = Date.parse(broadcast.createdAt);
    return Number.isNaN(timestamp) ? latest : Math.max(latest, timestamp);
  }, 0);
}

function mapThreadUnreadCounts(threads: ChatThreadSummary[]) {
  return threads.reduce<Record<string, number>>((state, thread) => {
    if (thread.unreadCount > 0) {
      state[thread.contact.id] = thread.unreadCount;
    }

    return state;
  }, {});
}

function emitWithAck<TResponse>(
  socket: Socket,
  event: string,
): Promise<TResponse>;
function emitWithAck<TResponse, TPayload>(
  socket: Socket,
  event: string,
  payload: TPayload,
): Promise<TResponse>;
function emitWithAck<TResponse, TPayload>(
  socket: Socket,
  event: string,
  payload?: TPayload,
) {
  return new Promise<TResponse>((resolve, reject) => {
    const callback = (error: Error | null, response: TResponse) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(response);
    };

    const timeoutSocket = socket.timeout(10_000);

    if (payload === undefined) {
      timeoutSocket.emit(event, callback);
      return;
    }

    timeoutSocket.emit(event, payload, callback);
  });
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef<RealtimeListenerMap>({});
  const currentUserIdRef = useRef<string | null>(user?.id ?? null);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>('disconnected');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [threadUnreadCounts, setThreadUnreadCounts] = useState<
    Record<string, number>
  >({});
  const [unreadBroadcastCount, setUnreadBroadcastCount] = useState(0);
  const [presenceByUserId, setPresenceByUserId] = useState<
    Record<string, PresenceEntry>
  >({});
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [toasts, setToasts] = useState<RealtimeToast[]>([]);

  useEffect(() => {
    currentUserIdRef.current = user?.id ?? null;
  }, [user?.id]);

  const dismissToast = useCallback((toastId: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  }, []);

  const dismissActiveCall = useCallback(() => {
    setActiveCall(null);
  }, []);

  const queueToast = useCallback(
    (toast: RealtimeToast) => {
      setToasts((current) => [toast, ...current].slice(0, 5));
      window.setTimeout(() => {
        dismissToast(toast.id);
      }, 4500);
    },
    [dismissToast],
  );

  const emitLocal = useCallback(
    <TEvent extends keyof RealtimeEventMap>(
      event: TEvent,
      payload: RealtimeEventMap[TEvent],
    ) => {
      listenersRef.current[event]?.forEach((listener) => {
        (listener as (payload: RealtimeEventMap[TEvent]) => void)(payload);
      });
    },
    [],
  );

  const subscribe = useCallback(
    <TEvent extends keyof RealtimeEventMap>(
      event: TEvent,
      listener: (payload: RealtimeEventMap[TEvent]) => void,
    ) => {
      let listeners = listenersRef.current[event] as
        | Set<(payload: RealtimeEventMap[TEvent]) => void>
        | undefined;

      if (!listeners) {
        listeners = new Set<(payload: RealtimeEventMap[TEvent]) => void>();
        listenersRef.current[event] = listeners as Set<
          (payload: RealtimeEventMap[keyof RealtimeEventMap]) => void
        >;
      }

      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    [],
  );

  const refreshNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const items = await notificationsService.list(50);
    setNotifications(items);
  }, [user]);

  const refreshBroadcasts = useCallback(async () => {
    if (!user || user.role === 'customer') {
      setBroadcasts([]);
      return;
    }

    const items = await messagesService.listBroadcasts();
    setBroadcasts(items);
  }, [user]);

  const refreshThreadUnreadState = useCallback(async () => {
    if (!user) {
      setThreadUnreadCounts({});
      return;
    }

    const items = await messagesService.listThreads();
    setThreadUnreadCounts(mapThreadUnreadCounts(items));
  }, [user]);

  const applyNotificationUpdated = useCallback((notification: NotificationItem) => {
    setNotifications((current) => {
      const exists = current.some((item) => item.id === notification.id);

      if (!exists) {
        return [notification, ...current].slice(0, 50);
      }

      return current.map((item) =>
        item.id === notification.id ? notification : item,
      );
    });
  }, []);

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnectionState('disconnected');
      setNotifications([]);
      setBroadcasts([]);
      setThreadUnreadCounts({});
      setUnreadBroadcastCount(0);
      setPresenceByUserId({});
      setActiveCall(null);
      return;
    }

    let disposed = false;
    setConnectionState('connecting');

    void Promise.all([
      refreshNotifications(),
      refreshBroadcasts(),
      refreshThreadUnreadState(),
    ]).catch(() => {
      if (disposed) {
        return;
      }
    });

    const socket = io(`${SOCKET_URL}${REALTIME_NAMESPACE}`, {
      withCredentials: true,
      autoConnect: false,
      transports: ['websocket', 'polling'],
      auth: (callback) => {
        callback({
          token: localStorage.getItem('accessToken') ?? '',
        });
      },
    });

    socketRef.current = socket;

    const handlePresenceSnapshot = (entries: PresenceEntry[]) => {
      const nextState = entries.reduce<Record<string, PresenceEntry>>(
        (state, entry) => {
          state[entry.userId] = entry;
          return state;
        },
        {},
      );

      setPresenceByUserId(nextState);
      emitLocal(realtimeEvent.presenceSnapshot, entries);
    };

    const handlePresenceChanged = (entry: PresenceEntry) => {
      setPresenceByUserId((current) => ({
        ...current,
        [entry.userId]: entry,
      }));
      emitLocal(realtimeEvent.presenceChanged, entry);
    };

    const handleNotificationCreated = (notification: NotificationItem) => {
      setNotifications((current) => {
        const existing = current.find((item) => item.id === notification.id);

        if (existing) {
          return current.map((item) =>
            item.id === notification.id ? notification : item,
          );
        }

        return [notification, ...current].slice(0, 50);
      });
      emitLocal(realtimeEvent.notificationCreated, notification);

      if (notification.userId === currentUserIdRef.current) {
        queueToast(
          createToast(notification.severity, notification.title, notification.body),
        );
      }
    };

    const handleNotificationUpdated = (notification: NotificationItem) => {
      applyNotificationUpdated(notification);
      emitLocal(realtimeEvent.notificationUpdated, notification);
    };

    const handleNotificationsReadAll = (payload: NotificationsReadAllPayload) => {
      setNotifications((current) =>
        current.map((notification) =>
          payload.notificationIds.includes(notification.id)
            ? { ...notification, isRead: true, readAt: payload.readAt }
            : notification,
        ),
      );
      emitLocal(realtimeEvent.notificationsReadAll, payload);
    };

    const handleBroadcastCreated = (broadcast: BroadcastMessage) => {
      setBroadcasts((current) => {
        if (current.some((item) => item.id === broadcast.id)) {
          return current;
        }

        return [broadcast, ...current].slice(0, 20);
      });
      emitLocal(realtimeEvent.broadcastCreated, broadcast);

      if (broadcast.sender.id !== currentUserIdRef.current) {
        queueToast(createToast('info', broadcast.title, broadcast.body));
      }
    };

    const handleChatMessageCreated = (message: DirectMessage) => {
      emitLocal(realtimeEvent.chatMessageCreated, message);

      if (
        message.recipientId === currentUserIdRef.current &&
        message.senderId !== currentUserIdRef.current
      ) {
        setThreadUnreadCounts((current) => ({
          ...current,
          [message.senderId]: (current[message.senderId] ?? 0) + 1,
        }));
        queueToast(
          createToast('message', message.sender.displayName, message.body),
        );
      }
    };

    const handleChatMessageUpdated = (message: DirectMessage) => {
      emitLocal(realtimeEvent.chatMessageUpdated, message);
    };

    const handleChatMessageDeleted = (message: DirectMessage) => {
      if (
        message.recipientId === currentUserIdRef.current &&
        message.senderId !== currentUserIdRef.current &&
        !message.readAt
      ) {
        setThreadUnreadCounts((current) => {
          const nextCount = Math.max((current[message.senderId] ?? 0) - 1, 0);

          if (nextCount === (current[message.senderId] ?? 0)) {
            return current;
          }

          if (nextCount === 0) {
            const nextState = { ...current };
            delete nextState[message.senderId];
            return nextState;
          }

          return {
            ...current,
            [message.senderId]: nextCount,
          };
        });
      }

      emitLocal(realtimeEvent.chatMessageDeleted, message);
    };

    socket.on('connect', () => {
      setConnectionState('connected');
      void emitWithAck<{ ok: true }, Record<string, never>>(
        socket,
        realtimeClientEvent.presencePing,
        {},
      ).catch(() => {
        return;
      });
    });

    socket.on('disconnect', () => {
      setConnectionState('disconnected');
    });

    socket.on('connect_error', () => {
      setConnectionState('disconnected');
    });

    socket.on(realtimeEvent.presenceSnapshot, handlePresenceSnapshot);
    socket.on(realtimeEvent.presenceChanged, handlePresenceChanged);
    socket.on(realtimeEvent.notificationCreated, handleNotificationCreated);
    socket.on(realtimeEvent.notificationUpdated, handleNotificationUpdated);
    socket.on(realtimeEvent.notificationsReadAll, handleNotificationsReadAll);
    socket.on(realtimeEvent.broadcastCreated, handleBroadcastCreated);
    socket.on(realtimeEvent.chatMessageCreated, handleChatMessageCreated);
    socket.on(realtimeEvent.chatMessageUpdated, handleChatMessageUpdated);
    socket.on(realtimeEvent.chatMessageDeleted, handleChatMessageDeleted);
    socket.on(realtimeEvent.chatThreadRead, (payload: ChatThreadReadPayload) => {
      if (payload.userId === currentUserIdRef.current) {
        setThreadUnreadCounts((current) => {
          if (!(payload.contactId in current)) {
            return current;
          }

          const nextState = { ...current };
          delete nextState[payload.contactId];
          return nextState;
        });
      }

      emitLocal(realtimeEvent.chatThreadRead, payload);
    });
    socket.on(realtimeEvent.inventoryChanged, (payload) => {
      emitLocal(realtimeEvent.inventoryChanged, payload);
    });
    socket.on(realtimeEvent.analyticsRefresh, (payload) => {
      emitLocal(realtimeEvent.analyticsRefresh, payload);
    });
    socket.on(realtimeEvent.usersChanged, (payload) => {
      emitLocal(realtimeEvent.usersChanged, payload);
    });
    socket.on(realtimeEvent.orderCreated, (payload: OrderRecord) => {
      emitLocal(realtimeEvent.orderCreated, payload);
    });
    socket.on(realtimeEvent.orderUpdated, (payload: OrderRecord) => {
      emitLocal(realtimeEvent.orderUpdated, payload);
    });
    socket.on(realtimeEvent.callIncoming, (payload: CallSession) => {
      emitLocal(realtimeEvent.callIncoming, payload);

      if (payload.receiverId === currentUserIdRef.current) {
        setActiveCall(payload);
        queueToast(
          createToast(
            'info',
            `Incoming ${payload.type} call`,
            `${payload.caller.displayName} is calling you.`,
          ),
        );
      }
    });
    socket.on(realtimeEvent.callUpdated, (payload: CallSession) => {
      const isParticipant =
        payload.callerId === currentUserIdRef.current ||
        payload.receiverId === currentUserIdRef.current;

      if (isParticipant) {
        setActiveCall((current) => {
          if (current?.id === payload.id) {
            return payload;
          }

          if (
            [
              'ringing',
              'connecting',
              'active',
              'missed',
              'rejected',
              'failed',
            ].includes(payload.status)
          ) {
            return payload;
          }

          return current;
        });
      }

      emitLocal(realtimeEvent.callUpdated, payload);
    });
    socket.on(realtimeEvent.callLifecycle, (payload) => {
      emitLocal(realtimeEvent.callLifecycle, payload);
    });
    socket.on(realtimeEvent.callSignal, (payload) => {
      emitLocal(realtimeEvent.callSignal, payload);
    });
    socket.on(realtimeEvent.callRecordingCreated, (payload) => {
      emitLocal(realtimeEvent.callRecordingCreated, payload);
    });
    socket.on(realtimeEvent.meetingUpdated, (payload: Meeting) => {
      emitLocal(realtimeEvent.meetingUpdated, payload);
    });
    socket.on(realtimeEvent.meetingParticipantUpdated, (payload) => {
      emitLocal(realtimeEvent.meetingParticipantUpdated, payload);
    });
    socket.on(realtimeEvent.meetingSignal, (payload) => {
      emitLocal(realtimeEvent.meetingSignal, payload);
    });
    socket.on(realtimeEvent.meetingNoteCreated, (payload) => {
      emitLocal(realtimeEvent.meetingNoteCreated, payload);
    });
    socket.on(realtimeEvent.meetingNoteUpdated, (payload) => {
      emitLocal(realtimeEvent.meetingNoteUpdated, payload);
    });
    socket.on(realtimeEvent.meetingRecordingCreated, (payload) => {
      emitLocal(realtimeEvent.meetingRecordingCreated, payload);
    });
    socket.on(realtimeEvent.captionSegmentCreated, (payload) => {
      emitLocal(realtimeEvent.captionSegmentCreated, payload);
    });

    socket.connect();

    const heartbeatId = window.setInterval(() => {
      if (socket.connected) {
        void emitWithAck<{ ok: true }, Record<string, never>>(
          socket,
          realtimeClientEvent.presencePing,
          {},
        ).catch(() => {
          return;
        });
      }
    }, 30_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && socket.connected) {
        void emitWithAck<{ ok: true }, Record<string, never>>(
          socket,
          realtimeClientEvent.presencePing,
          {},
        ).catch(() => {
          return;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      disposed = true;
      window.clearInterval(heartbeatId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      socket.removeAllListeners();
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [
    applyNotificationUpdated,
    emitLocal,
    queueToast,
    refreshBroadcasts,
    refreshNotifications,
    refreshThreadUnreadState,
    user,
  ]);

  useEffect(() => {
    if (!user || user.role === 'customer') {
      return;
    }

    const storageKey = getBroadcastSeenStorageKey(user.id);
    if (!localStorage.getItem(storageKey)) {
      localStorage.setItem(storageKey, new Date().toISOString());
    }
  }, [user]);

  useEffect(() => {
    if (!user || user.role === 'customer') {
      setUnreadBroadcastCount(0);
      return;
    }

    const latestBroadcastAt = getLatestBroadcastTimestamp(broadcasts);
    if (!latestBroadcastAt) {
      setUnreadBroadcastCount(0);
      return;
    }

    const storageKey = getBroadcastSeenStorageKey(user.id);
    const storedSeenAt = localStorage.getItem(storageKey);
    const isMessagesRoute = location.pathname.startsWith('/messages');

    if (isMessagesRoute) {
      localStorage.setItem(storageKey, new Date(latestBroadcastAt).toISOString());
      setUnreadBroadcastCount(0);
      return;
    }

    if (!storedSeenAt) {
      localStorage.setItem(storageKey, new Date().toISOString());
      setUnreadBroadcastCount(0);
      return;
    }

    const seenAt = Date.parse(storedSeenAt);

    if (Number.isNaN(seenAt)) {
      localStorage.setItem(storageKey, new Date().toISOString());
      setUnreadBroadcastCount(0);
      return;
    }

    setUnreadBroadcastCount(
      broadcasts.filter((broadcast) => {
        if (broadcast.sender.id === user.id) {
          return false;
        }

        const createdAt = Date.parse(broadcast.createdAt);
        return !Number.isNaN(createdAt) && createdAt > seenAt;
      }).length,
    );
  }, [broadcasts, location.pathname, user]);

  const markNotificationRead = useCallback(async (notificationId: string) => {
    const socket = socketRef.current;

    if (socket?.connected) {
      await emitWithAck<NotificationItem, { notificationId: string }>(
        socket,
        realtimeClientEvent.notificationMarkRead,
        { notificationId },
      );
      return;
    }

    const notification = await notificationsService.markRead(notificationId);
    applyNotificationUpdated(notification);
  }, [applyNotificationUpdated]);

  const markAllNotificationsRead = useCallback(async () => {
    const socket = socketRef.current;

    if (socket?.connected) {
      await emitWithAck<NotificationsReadAllPayload>(
        socket,
        realtimeClientEvent.notificationMarkAllRead,
      );
      return;
    }

    const payload = await notificationsService.markAllRead();
    setNotifications((current) =>
      current.map((notification) =>
        payload.notificationIds.includes(notification.id)
          ? { ...notification, isRead: true, readAt: payload.readAt }
          : notification,
      ),
    );
  }, []);

  const sendDirectMessage = useCallback(
    async (payload: { recipientId: string; body: string }) => {
      const socket = socketRef.current;

      if (!socket?.connected) {
        throw new Error('Realtime connection unavailable.');
      }

      return emitWithAck<DirectMessage, typeof payload>(
        socket,
        realtimeClientEvent.chatSend,
        payload,
      );
    },
    [],
  );

  const updateDirectMessage = useCallback(
    async (payload: { messageId: string; body: string }) => {
      const socket = socketRef.current;

      if (!socket?.connected) {
        throw new Error('Realtime connection unavailable.');
      }

      return emitWithAck<DirectMessage, typeof payload>(
        socket,
        realtimeClientEvent.chatUpdate,
        payload,
      );
    },
    [],
  );

  const deleteDirectMessage = useCallback(
    async (payload: { messageId: string }) => {
      const socket = socketRef.current;

      if (!socket?.connected) {
        throw new Error('Realtime connection unavailable.');
      }

      return emitWithAck<DirectMessage, typeof payload>(
        socket,
        realtimeClientEvent.chatDelete,
        payload,
      );
    },
    [],
  );

  const markThreadRead = useCallback(async (contactId: string) => {
    const socket = socketRef.current;

    if (!socket?.connected) {
      setThreadUnreadCounts((current) => {
        if (!(contactId in current)) {
          return current;
        }

        const nextState = { ...current };
        delete nextState[contactId];
        return nextState;
      });
      return {
        contactId,
        userId: currentUserIdRef.current ?? '',
        readAt: new Date().toISOString(),
        messageIds: [],
      } satisfies ChatThreadReadPayload;
    }

    const response = await emitWithAck<ChatThreadReadPayload, { contactId: string }>(
      socket,
      realtimeClientEvent.chatMarkThreadRead,
      { contactId },
    );
    setThreadUnreadCounts((current) => {
      if (!(contactId in current)) {
        return current;
      }

      const nextState = { ...current };
      delete nextState[contactId];
      return nextState;
    });
    return response;
  }, []);

  const sendBroadcast = useCallback(
    async (payload: {
      title: string;
      body: string;
      audienceRoles?: UserRole[];
    }) => {
      const socket = socketRef.current;

      if (!socket?.connected) {
        throw new Error('Realtime connection unavailable.');
      }

      return emitWithAck<BroadcastMessage, typeof payload>(
        socket,
        realtimeClientEvent.broadcastSend,
        payload,
      );
    },
    [],
  );

  const startCall = useCallback(
    async (payload: { recipientId: string; type: 'voice' | 'video' }) => {
      const socket = socketRef.current;

      if (!socket?.connected) {
        throw new Error('Realtime connection unavailable.');
      }

      const call = await emitWithAck<CallSession, typeof payload>(
        socket,
        realtimeClientEvent.callStart,
        payload,
      );
      setActiveCall(call);
      return call;
    },
    [],
  );

  const acceptCall = useCallback(async (callId: string) => {
    const socket = socketRef.current;

    if (!socket?.connected) {
      throw new Error('Realtime connection unavailable.');
    }

    const call = await emitWithAck<CallSession, { callId: string }>(
      socket,
      realtimeClientEvent.callAccept,
      { callId },
    );
    setActiveCall(call);
    return call;
  }, []);

  const rejectCall = useCallback(async (callId: string) => {
    const socket = socketRef.current;

    if (!socket?.connected) {
      throw new Error('Realtime connection unavailable.');
    }

    const call = await emitWithAck<CallSession, { callId: string }>(
      socket,
      realtimeClientEvent.callReject,
      { callId },
    );
    setActiveCall(call);
    return call;
  }, []);

  const endCall = useCallback(async (callId: string) => {
    const socket = socketRef.current;

    if (!socket?.connected) {
      throw new Error('Realtime connection unavailable.');
    }

    const call = await emitWithAck<CallSession, { callId: string }>(
      socket,
      realtimeClientEvent.callEnd,
      { callId },
    );
    setActiveCall(call);
    return call;
  }, []);

  const failCall = useCallback(async (callId: string) => {
    const socket = socketRef.current;

    if (!socket?.connected) {
      throw new Error('Realtime connection unavailable.');
    }

    const call = await emitWithAck<CallSession, { callId: string }>(
      socket,
      realtimeClientEvent.callFail,
      { callId },
    );
    setActiveCall(call);
    return call;
  }, []);

  const sendCallSignal = useCallback(
    async (payload: {
      callId: string;
      type: RtcSignalEvent['type'];
      payload: Record<string, unknown>;
      clientRequestId?: string;
    }) => {
      const socket = socketRef.current;

      if (!socket?.connected) {
        throw new Error('Realtime connection unavailable.');
      }

      return emitWithAck<{ ok: true }, typeof payload>(
        socket,
        realtimeClientEvent.callSignal,
        payload,
      );
    },
    [],
  );

  const joinMeeting = useCallback(async (meetingId: string) => {
    const socket = socketRef.current;

    if (!socket?.connected) {
      throw new Error('Realtime connection unavailable.');
    }

    return emitWithAck<Meeting, { meetingId: string }>(
      socket,
      realtimeClientEvent.meetingJoin,
      { meetingId },
    );
  }, []);

  const leaveMeeting = useCallback(async (meetingId: string) => {
    const socket = socketRef.current;

    if (!socket?.connected) {
      throw new Error('Realtime connection unavailable.');
    }

    return emitWithAck<Meeting, { meetingId: string }>(
      socket,
      realtimeClientEvent.meetingLeave,
      { meetingId },
    );
  }, []);

  const sendMeetingSignal = useCallback(
    async (payload: {
      meetingId: string;
      targetUserId?: string;
      type: RtcSignalEvent['type'];
      payload: Record<string, unknown>;
      clientRequestId?: string;
    }) => {
      const socket = socketRef.current;

      if (!socket?.connected) {
        throw new Error('Realtime connection unavailable.');
      }

      return emitWithAck<{ ok: true }, typeof payload>(
        socket,
        realtimeClientEvent.meetingSignal,
        payload,
      );
    },
    [],
  );

  const unreadNotificationCount = notifications.filter(
    (notification) => !notification.isRead && !notification.isResolved,
  ).length;
  const unreadMessagingCount =
    Object.values(threadUnreadCounts).reduce((total, count) => total + count, 0) +
    unreadBroadcastCount;

  return (
    <RealtimeContext.Provider
      value={{
        connectionState,
        notifications,
        unreadNotificationCount,
        unreadMessagingCount,
        broadcasts,
        presenceByUserId,
        activeCall,
        toasts,
        setActiveCall,
        dismissActiveCall,
        dismissToast,
        refreshNotifications,
        refreshBroadcasts,
        markNotificationRead,
        markAllNotificationsRead,
        sendDirectMessage,
        updateDirectMessage,
        deleteDirectMessage,
        markThreadRead,
        sendBroadcast,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        failCall,
        sendCallSignal,
        joinMeeting,
        leaveMeeting,
        sendMeetingSignal,
        subscribe,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}
