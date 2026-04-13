import { MessageIcon, SearchIcon } from '../../../shared/components/AppIcons';
import { formatRole } from '../../../shared/utils/format';
import type { MessagingContact } from '../types/messaging.types';
import type { ConversationItem } from '../utils/message-ui';
import { MessagePresenceBadge } from './MessagePresenceBadge';

interface MessagesSidebarProps {
  connectionReady: boolean;
  conversationItems: ConversationItem[];
  loadingSidebar: boolean;
  refreshingSidebar: boolean;
  searchTerm: string;
  selectedContactId: string;
  unreadThreadsCount: number;
  onSearchChange: (value: string) => void;
  onSelectContact: (contact: MessagingContact) => void;
}

function renderConversationGroup(params: {
  title: string;
  items: ConversationItem[];
  selectedContactId: string;
  onSelectContact: (contact: MessagingContact) => void;
}) {
  const { items, onSelectContact, selectedContactId, title } = params;

  if (!items.length) {
    return null;
  }

  return (
    <section className="messages-sidebar-group">
      <div className="messages-sidebar-group-head">
        <span>{title}</span>
        <strong>{items.length}</strong>
      </div>

      <div className="messages-sidebar-group-list">
        {items.map((item) => (
          <button
            key={item.contact.id}
            type="button"
            className={`messages-conversation-item${
              selectedContactId === item.contact.id ? ' active' : ''
            }${item.unreadCount ? ' unread' : ''}`}
            onClick={() => onSelectContact(item.contact)}
          >
            <div className="messages-conversation-avatar">
              {item.contact.displayName.charAt(0).toUpperCase()}
              <span
                className={`messages-conversation-avatar-dot tone-${item.presenceTone}`}
                aria-hidden="true"
              />
            </div>

            <div className="messages-conversation-copy">
              <div className="messages-conversation-top">
                <strong>{item.contact.displayName}</strong>
                <span>{item.timestampLabel}</span>
              </div>

              <p>{item.preview}</p>

              <div className="messages-conversation-meta">
                <span>{formatRole(item.contact.role)}</span>
                <span>{item.contact.email}</span>
                {item.unreadCount ? (
                  <span className="messages-unread-pill">{item.unreadCount}</span>
                ) : null}
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function MessagesSidebarSkeleton() {
  return (
    <div className="messages-sidebar-skeleton">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="messages-sidebar-skeleton-row skeleton-card" />
      ))}
    </div>
  );
}

export function MessagesSidebar({
  connectionReady,
  conversationItems,
  loadingSidebar,
  refreshingSidebar,
  searchTerm,
  selectedContactId,
  unreadThreadsCount,
  onSearchChange,
  onSelectContact,
}: MessagesSidebarProps) {
  const unreadItems = conversationItems.filter((item) => item.unreadCount > 0);
  const directMessages = conversationItems.filter(
    (item) => item.unreadCount === 0 && item.summary,
  );
  const directoryItems = conversationItems.filter((item) => !item.summary);

  return (
    <aside className="messages-sidebar-shell">
      <div className="messages-sidebar-headline">
        <h2>Messages</h2>
        <div className="messages-sidebar-counters">
          <span className="messages-counter-pill" title="Total People">
            👥 {conversationItems.length}
          </span>
          {unreadThreadsCount > 0 && (
            <span className="messages-counter-pill unread" title="Unread Messages">
              🔔 {unreadThreadsCount}
            </span>
          )}
        </div>
      </div>

      <label className="messages-search-field">
        <SearchIcon className="messages-search-icon" />
        <input
          className="messages-search-input"
          placeholder="Search teammates or customers"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          aria-label="Search messaging contacts"
        />
      </label>

      <div className="messages-sidebar-status">
        <MessagePresenceBadge
          status={connectionReady ? 'active' : 'offline'}
          detail={refreshingSidebar ? 'Refreshing directory' : 'Realtime conversations'}
        />
      </div>

      <div className="messages-sidebar-scroll">
        {loadingSidebar ? (
          <MessagesSidebarSkeleton />
        ) : conversationItems.length ? (
          <>
            {renderConversationGroup({
              title: 'Unread',
              items: unreadItems,
              selectedContactId,
              onSelectContact,
            })}
            {renderConversationGroup({
              title: 'Recent',
              items: directMessages,
              selectedContactId,
              onSelectContact,
            })}
            {renderConversationGroup({
              title: 'Directory',
              items: directoryItems,
              selectedContactId,
              onSelectContact,
            })}
          </>
        ) : (
          <div className="messages-sidebar-empty">
            <div className="messages-empty-icon">
              <MessageIcon className="messages-empty-icon-svg" />
            </div>
            <strong>No conversations found</strong>
            <span>Try another search term or wait for new users to appear.</span>
          </div>
        )}
      </div>
    </aside>
  );
}
