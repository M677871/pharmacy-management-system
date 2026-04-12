import type { FormEvent } from 'react';
import { MessageIcon, SearchIcon } from '../../../shared/components/AppIcons';
import { formatDateTime, formatRole } from '../../../shared/utils/format';
import type { PresenceEntry, BroadcastMessage } from '../../realtime/types/realtime.types';
import type { MessagingContact } from '../types/messaging.types';
import type { BroadcastAudience } from '../hooks/useMessagingWorkspace';
import type { ConversationItem } from '../utils/message-ui';
import { getLastMessageTimestamp } from '../utils/message-ui';
import { MessagePresenceBadge } from './MessagePresenceBadge';

interface MessagesDetailsRailProps {
  availabilityItems: ConversationItem[];
  broadcastAudience: BroadcastAudience;
  broadcastBody: string;
  broadcastTitle: string;
  broadcasts: BroadcastMessage[];
  connectionState: 'disconnected' | 'connecting' | 'connected';
  isStaff: boolean;
  loadingBroadcasts: boolean;
  selectedContact: MessagingContact | null;
  selectedConversation: ConversationItem | null;
  selectedPresence?: PresenceEntry;
  sendingBroadcast: boolean;
  threadReadSummary: string | null;
  onBroadcastAudienceChange: (value: BroadcastAudience) => void;
  onBroadcastBodyChange: (value: string) => void;
  onBroadcastTitleChange: (value: string) => void;
  onSelectContact: (contact: MessagingContact) => void;
  onSendBroadcast: (event?: FormEvent) => void | Promise<void>;
}

function formatAudienceLabel(audienceRoles: BroadcastMessage['audienceRoles']) {
  return audienceRoles
    .map((role) => (role === 'admin' ? 'Admins' : role === 'employee' ? 'Employees' : 'Customers'))
    .join(' • ');
}

function AvailabilityCard(props: {
  availabilityItems: ConversationItem[];
  onSelectContact: (contact: MessagingContact) => void;
}) {
  const { availabilityItems, onSelectContact } = props;

  if (!availabilityItems.length) {
    return (
      <div className="messages-rail-empty">
        <strong>No contacts available</strong>
        <span>New staff or customer presences will appear here automatically.</span>
      </div>
    );
  }

  return (
    <div className="messages-rail-availability">
      {availabilityItems.slice(0, 6).map((item) => (
        <button
          key={item.contact.id}
          type="button"
          className="messages-rail-person"
          onClick={() => onSelectContact(item.contact)}
        >
          <div className="messages-rail-person-avatar">
            {item.contact.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="messages-rail-person-copy">
            <strong>{item.contact.displayName}</strong>
            <span>{formatRole(item.contact.role)}</span>
          </div>
          <MessagePresenceBadge entry={item.presence} compact />
        </button>
      ))}
    </div>
  );
}

export function MessagesDetailsRail({
  availabilityItems,
  broadcastAudience,
  broadcastBody,
  broadcastTitle,
  broadcasts,
  connectionState,
  isStaff,
  loadingBroadcasts,
  selectedContact,
  selectedConversation,
  selectedPresence,
  sendingBroadcast,
  threadReadSummary,
  onBroadcastAudienceChange,
  onBroadcastBodyChange,
  onBroadcastTitleChange,
  onSelectContact,
  onSendBroadcast,
}: MessagesDetailsRailProps) {
  return (
    <aside className="messages-rail-shell">
      <article className="messages-rail-card">
        <div className="messages-rail-card-head">
          <div>
            <span className="surface-card-eyebrow">Details</span>
            <h2>{selectedContact ? 'Conversation details' : 'Messaging details'}</h2>
          </div>
          <div
            className={`messages-rail-connection${
              connectionState === 'connected' ? '' : ' offline'
            }`}
          >
            <span className="messages-live-indicator-dot" aria-hidden="true" />
            {connectionState === 'connected' ? 'Live' : 'Offline'}
          </div>
        </div>

        {selectedContact ? (
          <div className="messages-rail-profile">
            <div className="messages-rail-profile-avatar">
              {selectedContact.displayName.charAt(0).toUpperCase()}
            </div>
            <strong>{selectedContact.displayName}</strong>
            <span>{selectedContact.email}</span>

            <div className="messages-rail-profile-status">
              <MessagePresenceBadge entry={selectedPresence} />
            </div>

            <div className="messages-rail-stats">
              <div>
                <span>Role</span>
                <strong>{formatRole(selectedContact.role)}</strong>
              </div>
              <div>
                <span>Last activity</span>
                <strong>{getLastMessageTimestamp(selectedConversation?.summary)}</strong>
              </div>
              <div>
                <span>Unread</span>
                <strong>{selectedConversation?.unreadCount ?? 0}</strong>
              </div>
              <div>
                <span>Outgoing state</span>
                <strong>{threadReadSummary ?? 'No sent messages yet'}</strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="messages-rail-empty">
            <strong>No thread selected</strong>
            <span>Select a conversation to inspect participant and read-state details.</span>
          </div>
        )}
      </article>

      <article className="messages-rail-card">
        <div className="messages-rail-card-head">
          <div>
            <span className="surface-card-eyebrow">
              {isStaff ? 'Roster' : 'Support team'}
            </span>
            <h2>{isStaff ? 'Available now' : 'Available staff'}</h2>
          </div>
        </div>

        <AvailabilityCard
          availabilityItems={availabilityItems}
          onSelectContact={onSelectContact}
        />
      </article>

      {isStaff ? (
        <article className="messages-rail-card">
          <div className="messages-rail-card-head">
            <div>
              <span className="surface-card-eyebrow">Announcement</span>
              <h2>Broadcast update</h2>
            </div>
          </div>

          <form className="messages-broadcast-form" onSubmit={onSendBroadcast}>
            <label className="workspace-field">
              <span>Audience</span>
              <select
                value={broadcastAudience}
                onChange={(event) =>
                  onBroadcastAudienceChange(
                    event.target.value as BroadcastAudience,
                  )
                }
              >
                <option value="all">All staff</option>
                <option value="admins">Admins only</option>
                <option value="employees">Employees only</option>
              </select>
            </label>

            <label className="workspace-field">
              <span>Headline</span>
              <input
                value={broadcastTitle}
                onChange={(event) => onBroadcastTitleChange(event.target.value)}
                required
              />
            </label>

            <label className="workspace-field">
              <span>Message</span>
              <textarea
                rows={5}
                value={broadcastBody}
                onChange={(event) => onBroadcastBodyChange(event.target.value)}
                required
              />
            </label>

            <button
              type="submit"
              className="workspace-primary-action"
              disabled={sendingBroadcast}
            >
              {sendingBroadcast ? 'Sending…' : 'Send announcement'}
            </button>
          </form>
        </article>
      ) : null}

      <article className="messages-rail-card">
        <div className="messages-rail-card-head">
          <div>
            <span className="surface-card-eyebrow">
              {isStaff ? 'Announcements' : 'Support guidance'}
            </span>
            <h2>{isStaff ? 'Recent broadcasts' : 'How to reach the team'}</h2>
          </div>
        </div>

        {isStaff ? (
          loadingBroadcasts ? (
            <div className="messages-rail-feed">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="messages-feed-skeleton skeleton-card" />
              ))}
            </div>
          ) : broadcasts.length ? (
            <div className="messages-rail-feed">
              {broadcasts.map((broadcast) => (
                <article key={broadcast.id} className="messages-broadcast-card">
                  <div className="messages-broadcast-top">
                    <strong>{broadcast.title}</strong>
                    <span>{formatDateTime(broadcast.createdAt)}</span>
                  </div>
                  <p>{broadcast.body}</p>
                  <div className="messages-broadcast-footer">
                    <span>{broadcast.sender.displayName}</span>
                    <span>{formatAudienceLabel(broadcast.audienceRoles)}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="messages-rail-empty">
              <strong>No broadcasts yet</strong>
              <span>Announcements will appear here the moment they are sent.</span>
            </div>
          )
        ) : (
          <div className="messages-rail-guidance">
            <div className="messages-guidance-row">
              <SearchIcon className="messages-guidance-icon" />
              <div>
                <strong>Find the right person fast</strong>
                <span>Use the directory search to jump straight into a staff conversation.</span>
              </div>
            </div>
            <div className="messages-guidance-row">
              <MessageIcon className="messages-guidance-icon" />
              <div>
                <strong>Messages update live</strong>
                <span>Presence, new replies, and read state sync in real time while connected.</span>
              </div>
            </div>
          </div>
        )}
      </article>
    </aside>
  );
}
