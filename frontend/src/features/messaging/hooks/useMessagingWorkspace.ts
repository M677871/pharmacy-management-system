import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { useRealtime } from '../../realtime/hooks/useRealtime';
import { useRealtimeEvent } from '../../realtime/hooks/useRealtimeEvent';
import { realtimeEvent } from '../../realtime/types/realtime.types';
import { getErrorMessage } from '../../../shared/utils/format';
import { messagesService } from '../services/messages.service';
import type {
  ChatThreadSummary,
  DirectMessage,
  MessagingContact,
} from '../types/messaging.types';
import {
  buildAvailabilityItems,
  buildConversationItems,
  buildMessageClusters,
  getThreadReadSummary,
  upsertThreadSummary,
} from '../utils/message-ui';

export type BroadcastAudience = 'all' | 'admins' | 'employees';

function canIssueReadReceipt() {
  if (typeof document === 'undefined') {
    return true;
  }

  return document.visibilityState === 'visible' && document.hasFocus();
}

export function useMessagingWorkspace() {
  const { user } = useAuth();
  const {
    broadcasts,
    connectionState,
    deleteDirectMessage,
    markThreadRead,
    presenceByUserId,
    refreshBroadcasts,
    sendBroadcast,
    sendDirectMessage,
    startCall,
    updateDirectMessage,
  } = useRealtime();
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearch = useDeferredValue(searchTerm);
  const [contacts, setContacts] = useState<MessagingContact[]>([]);
  const [threadSummaries, setThreadSummaries] = useState<ChatThreadSummary[]>([]);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [selectedContactSnapshot, setSelectedContactSnapshot] =
    useState<MessagingContact | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [messageBody, setMessageBody] = useState('');
  const [editingMessageId, setEditingMessageId] = useState('');
  const [deletingMessageId, setDeletingMessageId] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastAudience, setBroadcastAudience] =
    useState<BroadcastAudience>('all');
  const [loadingSidebar, setLoadingSidebar] = useState(true);
  const [refreshingSidebar, setRefreshingSidebar] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [loadedThreadContactId, setLoadedThreadContactId] = useState('');
  const [loadingBroadcasts, setLoadingBroadcasts] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [error, setError] = useState('');
  const [flashMessage, setFlashMessage] = useState('');
  const selectedContactIdRef = useRef('');
  const sidebarRequestRef = useRef(0);
  const threadRequestRef = useRef(0);
  const readReceiptRequestRef = useRef('');
  const hasLoadedSidebarRef = useRef(false);
  const [readReceiptViewActive, setReadReceiptViewActive] = useState(
    canIssueReadReceipt,
  );
  const isStaff = user?.role === 'admin' || user?.role === 'employee';

  useEffect(() => {
    selectedContactIdRef.current = selectedContactId;
  }, [selectedContactId]);

  useEffect(() => {
    const updateReadReceiptViewState = () => {
      setReadReceiptViewActive(canIssueReadReceipt());
    };

    updateReadReceiptViewState();
    document.addEventListener('visibilitychange', updateReadReceiptViewState);
    window.addEventListener('focus', updateReadReceiptViewState);
    window.addEventListener('blur', updateReadReceiptViewState);

    return () => {
      document.removeEventListener('visibilitychange', updateReadReceiptViewState);
      window.removeEventListener('focus', updateReadReceiptViewState);
      window.removeEventListener('blur', updateReadReceiptViewState);
    };
  }, []);

  const conversationItems = useMemo(
    () => {
      const items = buildConversationItems({
        contacts,
        currentUserId: user?.id,
        presenceByUserId,
        threadSummaries,
      });

      if (!deferredSearch.trim()) {
        return items;
      }

      const lowerSearch = deferredSearch.toLowerCase().trim();
      return items.filter(
        (item) =>
          item.contact.displayName.toLowerCase().includes(lowerSearch) ||
          item.contact.email.toLowerCase().includes(lowerSearch) ||
          (item.preview?.toLowerCase() ?? '').includes(lowerSearch)
      );
    },
    [contacts, presenceByUserId, threadSummaries, user?.id, deferredSearch],
  );

  const availabilityItems = useMemo(
    () => buildAvailabilityItems(conversationItems),
    [conversationItems],
  );

  const selectedConversation = useMemo(
    () =>
      conversationItems.find((item) => item.contact.id === selectedContactId) ?? null,
    [conversationItems, selectedContactId],
  );

  const selectedContact =
    selectedConversation?.contact ??
    (selectedContactSnapshot?.id === selectedContactId
      ? selectedContactSnapshot
      : null);
  const isEditingMessage = Boolean(editingMessageId);
  const selectedPresence = selectedContact
    ? presenceByUserId[selectedContact.id]
    : undefined;
  const unreadThreadsCount = threadSummaries.filter(
    (summary) => summary.unreadCount > 0,
  ).length;
  const messageClusters = useMemo(
    () => buildMessageClusters(messages, user?.id),
    [messages, user?.id],
  );
  const threadReadSummary = useMemo(
    () => getThreadReadSummary(messages, user?.id),
    [messages, user?.id],
  );
  const connectionReady = connectionState === 'connected';

  useEffect(() => {
    if (!flashMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFlashMessage('');
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [flashMessage]);

  useEffect(() => {
    if (selectedConversation) {
      setSelectedContactSnapshot(selectedConversation.contact);
    }
  }, [selectedConversation]);

  function applyMessageUpdated(updatedMessage: DirectMessage) {
    if (!user) {
      return;
    }

    const contact =
      updatedMessage.senderId === user.id
        ? updatedMessage.recipient
        : updatedMessage.sender;

    setMessages((current) =>
      current.map((message) =>
        message.id === updatedMessage.id ? updatedMessage : message,
      ),
    );
    setThreadSummaries((current) =>
      current.map((summary) =>
        summary.contact.id !== contact.id
          ? summary
          : summary.lastMessage.id === updatedMessage.id
            ? { ...summary, lastMessage: updatedMessage }
            : summary,
      ),
    );
  }

  function applyMessageDeleted(deletedMessage: DirectMessage) {
    setMessages((current) =>
      current.filter((message) => message.id !== deletedMessage.id),
    );
  }

  function applyMessageCreated(message: DirectMessage) {
    if (!user) {
      return;
    }

    const contact = message.senderId === user.id ? message.recipient : message.sender;
    const isOpenThread = selectedContactIdRef.current === contact.id;

    setContacts((current) => {
      if (current.some((item) => item.id === contact.id)) {
        return current;
      }

      return [contact, ...current];
    });

    setThreadSummaries((current) => {
      const existingSummary = current.find(
        (summary) => summary.contact.id === contact.id,
      );

      if (existingSummary?.lastMessage.id === message.id) {
        return current;
      }

      const isUnreadIncomingMessage =
        message.recipientId === user.id && message.senderId !== user.id;
      const unreadCount = isUnreadIncomingMessage
        ? isOpenThread && readReceiptViewActive
          ? 0
          : (existingSummary?.unreadCount ?? 0) + 1
        : (existingSummary?.unreadCount ?? 0);

      return upsertThreadSummary(current, {
        contact,
        lastMessage: message,
        unreadCount,
        isClosed: existingSummary?.isClosed ?? false,
        closedAt: existingSummary?.closedAt ?? null,
      });
    });

    if (isOpenThread) {
      setMessages((current) =>
        current.some((existingMessage) => existingMessage.id === message.id)
          ? current
          : [...current, message],
      );
    }
  }

  function applyThreadRead(payload: {
    userId: string;
    contactId: string;
    readAt: string;
    messageIds: string[];
  }) {
    if (payload.userId === user?.id) {
      setThreadSummaries((current) =>
        current.map((summary) =>
          summary.contact.id === payload.contactId
            ? { ...summary, unreadCount: 0 }
            : summary,
        ),
      );
    }

    if (!payload.messageIds.length) {
      return;
    }

    setMessages((current) =>
      current.map((message) =>
        payload.messageIds.includes(message.id)
          ? { ...message, readAt: payload.readAt }
          : message,
      ),
    );

    setThreadSummaries((current) =>
      current.map((summary) =>
        payload.messageIds.includes(summary.lastMessage.id)
          ? {
              ...summary,
              lastMessage: {
                ...summary.lastMessage,
                readAt: payload.readAt,
              },
            }
          : summary,
      ),
    );
  }

  async function loadSidebar(search = deferredSearch, background = false) {
    const requestId = sidebarRequestRef.current + 1;
    sidebarRequestRef.current = requestId;

    if (hasLoadedSidebarRef.current || background) {
      setRefreshingSidebar(true);
    } else {
      setLoadingSidebar(true);
    }

    const [contactsData, threadsData] = await Promise.all([
      messagesService.listContacts(search),
      messagesService.listThreads(),
    ]);

    if (sidebarRequestRef.current !== requestId) {
      return;
    }

    hasLoadedSidebarRef.current = true;
    startTransition(() => {
      setContacts(contactsData);
      setThreadSummaries(threadsData);
    });

    const nextContacts = [...threadsData.map((thread) => thread.contact), ...contactsData];
    const nextContactMap = new Map(nextContacts.map((contact) => [contact.id, contact]));
    const currentSelectedId = selectedContactIdRef.current;
    const nextSelectedId =
      (currentSelectedId && nextContactMap.has(currentSelectedId)
        ? currentSelectedId
        : '') ||
      threadsData[0]?.contact.id ||
      contactsData[0]?.id ||
      '';

    setSelectedContactId(nextSelectedId);

    const nextSelectedContact = nextContactMap.get(nextSelectedId);
    if (nextSelectedContact) {
      setSelectedContactSnapshot(nextSelectedContact);
    }

    setLoadingSidebar(false);
    setRefreshingSidebar(false);
  }

  async function loadThread(contactId: string) {
    const requestId = threadRequestRef.current + 1;
    threadRequestRef.current = requestId;

    if (!contactId) {
      setMessages([]);
      setLoadedThreadContactId('');
      return;
    }

    setLoadingThread(true);
    setLoadedThreadContactId('');

    try {
      const threadMessages = await messagesService.listThread(contactId);

      if (threadRequestRef.current !== requestId) {
        return;
      }

      startTransition(() => {
        setMessages(threadMessages);
      });
      setLoadedThreadContactId(contactId);
    } catch (loadError) {
      if (threadRequestRef.current !== requestId) {
        return;
      }

      setLoadedThreadContactId('');
      setError(getErrorMessage(loadError, 'Unable to load the conversation.'));
    } finally {
      if (threadRequestRef.current === requestId) {
        setLoadingThread(false);
      }
    }
  }

  useEffect(() => {
    let active = true;
    setError('');

    void loadSidebar('', false).catch((loadError) => {
      if (!active) {
        return;
      }

      setError(getErrorMessage(loadError, 'Unable to load messages.'));
      setLoadingSidebar(false);
      setRefreshingSidebar(false);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedSidebarRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadSidebar(deferredSearch, true).catch((loadError) => {
        setError(getErrorMessage(loadError, 'Unable to search contacts.'));
        setRefreshingSidebar(false);
      });
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [deferredSearch]);

  useEffect(() => {
    if (!selectedContactId) {
      setMessages([]);
      return;
    }

    void loadThread(selectedContactId);
  }, [selectedContactId]);

  useEffect(() => {
    if (
      !user ||
      !selectedContactId ||
      loadingThread ||
      loadedThreadContactId !== selectedContactId ||
      !readReceiptViewActive ||
      readReceiptRequestRef.current === selectedContactId
    ) {
      return;
    }

    const hasUnreadIncomingMessage = messages.some(
      (message) =>
        message.senderId === selectedContactId &&
        message.recipientId === user.id &&
        !message.readAt,
    );
    const hasUnreadSummary = (selectedConversation?.unreadCount ?? 0) > 0;

    if (!hasUnreadIncomingMessage && !hasUnreadSummary) {
      return;
    }

    readReceiptRequestRef.current = selectedContactId;

    void markThreadRead(selectedContactId)
      .then((payload) => {
        applyThreadRead(payload);
      })
      .catch(() => {
        return;
      })
      .finally(() => {
        if (readReceiptRequestRef.current === selectedContactId) {
          readReceiptRequestRef.current = '';
        }
      });
  }, [
    loadedThreadContactId,
    loadingThread,
    markThreadRead,
    messages,
    readReceiptViewActive,
    selectedContactId,
    selectedConversation?.unreadCount,
    user,
  ]);

  useEffect(() => {
    if (!isStaff) {
      return;
    }

    setLoadingBroadcasts(true);
    void refreshBroadcasts()
      .catch(() => {
        return;
      })
      .finally(() => {
        setLoadingBroadcasts(false);
      });
  }, [isStaff, refreshBroadcasts]);

  useRealtimeEvent(realtimeEvent.chatMessageCreated, (message) => {
    if (!user) {
      return;
    }

    applyMessageCreated(message);
  });

  useRealtimeEvent(realtimeEvent.chatThreadRead, (payload) => {
    if (!user) {
      return;
    }

    applyThreadRead(payload);
  });

  useRealtimeEvent(realtimeEvent.chatMessageUpdated, (message) => {
    applyMessageUpdated(message);
    void loadSidebar(deferredSearch, true).catch(() => {
      return;
    });
  });

  useRealtimeEvent(realtimeEvent.chatMessageDeleted, (message) => {
    applyMessageDeleted(message);

    if (editingMessageId === message.id) {
      setEditingMessageId('');
      setMessageBody('');
    }

    void loadSidebar(deferredSearch, true).catch(() => {
      return;
    });
  });

  useRealtimeEvent(realtimeEvent.usersChanged, () => {
    void loadSidebar(deferredSearch, true).catch(() => {
      return;
    });
  });

  function selectContact(contact: MessagingContact) {
    setSelectedContactId(contact.id);
    setSelectedContactSnapshot(contact);

    if (editingMessageId) {
      setMessageBody('');
    }

    setEditingMessageId('');
    setFlashMessage('');
  }

  function startEditingMessage(message: DirectMessage) {
    setEditingMessageId(message.id);
    setMessageBody(message.body);
    setError('');
    setFlashMessage('');
  }

  function cancelEditingMessage() {
    setEditingMessageId('');
    setMessageBody('');
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (sendingMessage || !messageBody.trim() || !selectedContactId || !connectionReady) {
      return;
    }

    void handleSendMessage();
  }

  async function handleSendMessage(event?: FormEvent) {
    event?.preventDefault();

    if (!selectedContactId || !messageBody.trim()) {
      return;
    }

    setSendingMessage(true);
    setError('');
    setFlashMessage('');

    try {
      if (editingMessageId) {
        const updatedMessage = await updateDirectMessage({
          messageId: editingMessageId,
          body: messageBody.trim(),
        });

        applyMessageUpdated(updatedMessage);
        setEditingMessageId('');
        setMessageBody('');
        void loadSidebar(deferredSearch, true).catch(() => {
          return;
        });
        return;
      }

      const createdMessage = await sendDirectMessage({
        recipientId: selectedContactId,
        body: messageBody.trim(),
      });
      applyMessageCreated(createdMessage);
      setMessageBody('');
    } catch (sendError) {
      setError(getErrorMessage(sendError, 'Unable to send the message.'));
    } finally {
      setSendingMessage(false);
    }
  }

  async function handleDeleteMessage(message: DirectMessage) {
    if (
      !window.confirm(
        'Delete this message for everyone in the conversation?',
      )
    ) {
      return;
    }

    setDeletingMessageId(message.id);
    setError('');
    setFlashMessage('');

    try {
      const deletedMessage = await deleteDirectMessage({ messageId: message.id });
      applyMessageDeleted(deletedMessage);

      if (editingMessageId === message.id) {
        setEditingMessageId('');
        setMessageBody('');
      }

      void loadSidebar(deferredSearch, true).catch(() => {
        return;
      });
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Unable to delete the message.'));
    } finally {
      setDeletingMessageId((current) =>
        current === message.id ? '' : current,
      );
    }
  }

  async function handleSendBroadcast(event?: FormEvent) {
    event?.preventDefault();

    if (!broadcastTitle.trim() || !broadcastBody.trim()) {
      return;
    }

    setSendingBroadcast(true);
    setError('');
    setFlashMessage('');

    try {
      await sendBroadcast({
        title: broadcastTitle.trim(),
        body: broadcastBody.trim(),
        audienceRoles:
          broadcastAudience === 'all'
            ? ['admin', 'employee']
            : broadcastAudience === 'admins'
              ? ['admin']
              : ['employee'],
      });
      setBroadcastTitle('');
      setBroadcastBody('');
      setFlashMessage('Announcement sent successfully.');
    } catch (sendError) {
      setError(getErrorMessage(sendError, 'Unable to send the broadcast.'));
    } finally {
      setSendingBroadcast(false);
    }
  }

  async function handleStartCall(type: 'voice' | 'video') {
    if (!selectedContactId) {
      return;
    }

    setError('');

    try {
      await startCall({
        recipientId: selectedContactId,
        type,
      });
    } catch (callError) {
      setError(getErrorMessage(callError, 'Unable to start the call.'));
    }
  }

  return {
    availabilityItems,
    broadcastAudience,
    broadcastBody,
    broadcastTitle,
    broadcasts,
    connectionReady,
    connectionState,
    conversationItems,
    deletingMessageId,
    editingMessageId,
    error,
    flashMessage,
    cancelEditingMessage,
    handleComposerKeyDown,
    handleDeleteMessage,
    handleSendBroadcast,
    handleSendMessage,
    handleStartCall,
    isStaff,
    isEditingMessage,
    loadingBroadcasts,
    loadingSidebar,
    loadingThread,
    messageBody,
    messageClusters,
    messages,
    presenceByUserId,
    refreshingSidebar,
    searchTerm,
    selectedContact,
    selectedContactId,
    selectedConversation,
    selectedPresence,
    sendingBroadcast,
    sendingMessage,
    setBroadcastAudience,
    setBroadcastBody,
    setBroadcastTitle,
    setMessageBody,
    setSearchTerm,
    selectContact,
    startEditingMessage,
    threadReadSummary,
    unreadThreadsCount,
  };
}
