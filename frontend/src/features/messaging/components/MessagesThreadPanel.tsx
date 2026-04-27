import { useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { MessageIcon, PhoneIcon, VideoIcon } from '../../../shared/components/AppIcons';
import { formatRole } from '../../../shared/utils/format';
import type { DirectMessage, MessagingContact } from '../types/messaging.types';
import type { MessageCluster, ConversationItem } from '../utils/message-ui';
import { formatMessageClock } from '../utils/message-ui';
import type { PresenceEntry } from '../../realtime/types/realtime.types';
import { MessagePresenceBadge } from './MessagePresenceBadge';

interface MessagesThreadPanelProps {
  connectionReady: boolean;
  loadingThread: boolean;
  messageBody: string;
  messageClusters: MessageCluster[];
  selectedContact: MessagingContact | null;
  selectedConversation: ConversationItem | null;
  selectedPresence?: PresenceEntry;
  editingMessageId: string;
  deletingMessageId: string;
  isEditingMessage: boolean;
  sendingMessage: boolean;
  threadReadSummary: string | null;
  onMessageBodyChange: (value: string) => void;
  onSendMessage: (event?: FormEvent) => void | Promise<void>;
  onComposerKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onStartEditingMessage: (message: DirectMessage) => void;
  onCancelEditingMessage: () => void;
  onDeleteMessage: (message: DirectMessage) => void | Promise<void>;
  onStartVoiceCall: () => void | Promise<void>;
  onStartVideoCall: () => void | Promise<void>;
}

function MessagesThreadSkeleton() {
  return (
    <div className="messages-thread-skeleton">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className={`messages-thread-skeleton-row${index % 2 ? ' outgoing' : ''}`}
        >
          <div className="messages-thread-skeleton-avatar skeleton-card" />
          <div className="messages-thread-skeleton-copy">
            <div className="messages-thread-skeleton-line skeleton-card" />
            <div className="messages-thread-skeleton-line short skeleton-card" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MessagesThreadPanel({
  connectionReady,
  loadingThread,
  messageBody,
  messageClusters,
  selectedContact,
  selectedConversation,
  selectedPresence,
  editingMessageId,
  deletingMessageId,
  isEditingMessage,
  sendingMessage,
  threadReadSummary,
  onComposerKeyDown,
  onCancelEditingMessage,
  onDeleteMessage,
  onMessageBodyChange,
  onSendMessage,
  onStartEditingMessage,
  onStartVideoCall,
  onStartVoiceCall,
}: MessagesThreadPanelProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const lastOutgoingClusterId = [...messageClusters]
    .reverse()
    .find((cluster) => cluster.isOutgoing)?.id;
  const contactOnline =
    selectedPresence?.status === 'active' || selectedPresence?.status === 'online';
  const callDisabled = !connectionReady || !contactOnline;

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const node = scrollRef.current;

      if (!node) {
        return;
      }

      node.scrollTop = node.scrollHeight;
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [messageClusters.length, selectedContact?.id]);

  useEffect(() => {
    if (!isEditingMessage) {
      return;
    }

    composerRef.current?.focus();
  }, [isEditingMessage]);

  useEffect(() => {
    const composer = composerRef.current;

    if (!composer) {
      return;
    }

    composer.style.height = '0px';
    composer.style.height = `${Math.min(composer.scrollHeight, 180)}px`;
  }, [messageBody, isEditingMessage, selectedContact?.id]);

  if (!selectedContact) {
    return (
      <article className="messages-thread-shell">
        <div className="messages-thread-empty">
          <div className="messages-empty-icon">
            <MessageIcon className="messages-empty-icon-svg" />
          </div>
          <strong>Select a conversation</strong>
          <span>
            Choose a contact from the sidebar to open a live conversation and start
            coordinating in real time.
          </span>
        </div>
      </article>
    );
  }

  return (
    <article className="messages-thread-shell">
      <header className="messages-thread-header-minimal">
        <div className="messages-thread-header-profile">
          <div className="messages-thread-avatar-tiny">
            {selectedContact.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="messages-thread-header-info">
            <h2>{selectedContact.displayName}</h2>
            <div className="messages-thread-header-status">
              <MessagePresenceBadge entry={selectedPresence} compact />
              <span className="messages-thread-header-role">{formatRole(selectedContact.role)}</span>
            </div>
          </div>
        </div>
        <div className="messages-thread-call-actions">
          <button
            type="button"
            className="messages-thread-call-button"
            onClick={() => {
              void onStartVoiceCall();
            }}
            disabled={callDisabled}
            title={contactOnline ? 'Start voice call' : 'Contact is offline'}
          >
            <PhoneIcon className="workspace-mini-icon" />
          </button>
          <button
            type="button"
            className="messages-thread-call-button"
            onClick={() => {
              void onStartVideoCall();
            }}
            disabled={callDisabled}
            title={contactOnline ? 'Start video call' : 'Contact is offline'}
          >
            <VideoIcon className="workspace-mini-icon" />
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="messages-thread-scroll">
        {loadingThread ? (
          <MessagesThreadSkeleton />
        ) : messageClusters.length ? (
          <div className="messages-thread-stream">
            {messageClusters.map((cluster) => (
              <div key={cluster.id}>
                {cluster.showDateDivider ? (
                  <div className="messages-date-divider">
                    <span>{cluster.dateLabel}</span>
                  </div>
                ) : null}

                <section
                  className={`messages-cluster${cluster.isOutgoing ? ' outgoing' : ''}`}
                >
                  <div className="messages-cluster-avatar">
                    {cluster.isOutgoing
                      ? 'Y'
                      : cluster.sender.displayName.charAt(0).toUpperCase()}
                  </div>

                  <div className="messages-cluster-content">
                    <div className="messages-cluster-header">
                      <strong>{cluster.isOutgoing ? 'You' : cluster.sender.displayName}</strong>
                      <span>{formatMessageClock(cluster.startedAt)}</span>
                    </div>

                    <div className="messages-cluster-messages">
                      {cluster.messages.map((message) => (
                        <article
                          key={message.id}
                          className={`messages-cluster-bubble${
                            cluster.isOutgoing ? ' outgoing' : ''
                          }${editingMessageId === message.id ? ' editing' : ''}`}
                        >
                          <p>{message.body}</p>
                          {cluster.isOutgoing ? (
                            <div className="messages-bubble-footer">
                              <span>{formatMessageClock(message.createdAt)}</span>
                              <div className="messages-bubble-actions">
                                <button
                                  type="button"
                                  className="messages-bubble-action"
                                  disabled={
                                    !connectionReady ||
                                    sendingMessage ||
                                    deletingMessageId === message.id
                                  }
                                  onClick={() => onStartEditingMessage(message)}
                                >
                                  {editingMessageId === message.id ? 'Editing' : 'Edit'}
                                </button>
                                <button
                                  type="button"
                                  className="messages-bubble-action danger"
                                  disabled={
                                    !connectionReady ||
                                    sendingMessage ||
                                    deletingMessageId === message.id
                                  }
                                  onClick={() => {
                                    void onDeleteMessage(message);
                                  }}
                                >
                                  {deletingMessageId === message.id ? 'Deleting…' : 'Delete'}
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </article>
                      ))}
                    </div>

                    {cluster.isOutgoing && cluster.id === lastOutgoingClusterId ? (
                      <div className="messages-cluster-read">
                        {threadReadSummary ?? 'Delivered'}
                      </div>
                    ) : null}
                  </div>
                </section>
              </div>
            ))}
          </div>
        ) : (
          <div className="messages-thread-empty">
            <div className="messages-empty-icon">
              <MessageIcon className="messages-empty-icon-svg" />
            </div>
            <strong>No messages yet</strong>
            <span>Start the conversation with a short first message.</span>
          </div>
        )}
      </div>

      <form className="messages-composer-shell" onSubmit={onSendMessage}>
        <div className="messages-composer-frame">
          {isEditingMessage ? (
            <div className="messages-composer-editing">
              <div>
                <strong>Editing message</strong>
                <span>Changes update the original message for both participants.</span>
              </div>
              <button
                type="button"
                className="messages-bubble-action"
                onClick={onCancelEditingMessage}
              >
                Cancel
              </button>
            </div>
          ) : null}

          <textarea
            ref={composerRef}
            rows={1}
            className="messages-composer-input"
            placeholder={
              isEditingMessage
                ? 'Update your message'
                : `Message ${selectedContact.displayName}`
            }
            value={messageBody}
            onChange={(event) => onMessageBodyChange(event.target.value)}
            onKeyDown={onComposerKeyDown}
            disabled={!connectionReady}
          />

          <div className="messages-composer-footer">
            <div className="messages-composer-hints">
              <span>
                {connectionReady
                  ? isEditingMessage
                    ? 'Enter to save changes'
                    : 'Enter to send'
                  : 'Reconnect to send messages'}
              </span>
              <span>Shift + Enter for a new line</span>
            </div>

            <button
              type="submit"
              className="workspace-primary-action messages-send-button"
              disabled={sendingMessage || !messageBody.trim() || !connectionReady}
            >
              {sendingMessage
                ? isEditingMessage
                  ? 'Saving…'
                  : 'Sending…'
                : isEditingMessage
                  ? 'Save changes'
                  : 'Send message'}
            </button>
          </div>
        </div>
      </form>
    </article>
  );
}
