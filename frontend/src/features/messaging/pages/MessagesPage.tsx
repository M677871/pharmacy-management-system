import { AppShell } from '../../../shared/components/AppShell';
import { useMessagingWorkspace } from '../hooks/useMessagingWorkspace';
import { MessagesDetailsRail } from '../components/MessagesDetailsRail';
import { MessagesSidebar } from '../components/MessagesSidebar';
import { MessagesThreadPanel } from '../components/MessagesThreadPanel';
import { MessagePresenceBadge } from '../components/MessagePresenceBadge';
import { MessageIcon, SearchIcon } from '../../../shared/components/AppIcons';
import { formatRole } from '../../../shared/utils/format';

export function MessagesPage() {
  const {
    availabilityItems,
    broadcastAudience,
    broadcastBody,
    broadcastTitle,
    broadcasts,
    cancelEditingMessage,
    connectionReady,
    connectionState,
    conversationItems,
    deletingMessageId,
    editingMessageId,
    error,
    flashMessage,
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
  } = useMessagingWorkspace();

  if (!isStaff) {
    return (
      <AppShell
        pageTitle="Messages"
        pageSubtitle="Contact the pharmacy team about products, orders, and delivery."
      >
        <div className="client-messages-page">
          {error ? <div className="error-message">{error}</div> : null}
          {flashMessage ? <div className="success-message">{flashMessage}</div> : null}

          <section className="client-messages-layout">
            <aside className="client-contact-panel">
              <div className="client-contact-header">
                <div>
                  <span className="surface-card-eyebrow">Contacts</span>
                  <h2>Pharmacy team</h2>
                </div>
                <MessagePresenceBadge
                  status={connectionReady ? 'active' : 'offline'}
                  detail={refreshingSidebar ? 'Refreshing' : 'Live'}
                />
              </div>

              <label className="client-contact-search">
                <SearchIcon className="messages-search-icon" />
                <input
                  className="messages-search-input"
                  placeholder="Search contacts"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  aria-label="Search messaging contacts"
                />
              </label>

              <div className="client-contact-list">
                {loadingSidebar ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="client-contact-skeleton skeleton-card" />
                  ))
                ) : conversationItems.length ? (
                  conversationItems.map((item) => (
                    <button
                      key={item.contact.id}
                      type="button"
                      className={`client-contact-card${
                        selectedContactId === item.contact.id ? ' active' : ''
                      }${item.unreadCount ? ' unread' : ''}`}
                      onClick={() => selectContact(item.contact)}
                    >
                      <div className="client-contact-avatar">
                        {item.contact.displayName.charAt(0).toUpperCase()}
                        <span
                          className={`messages-conversation-avatar-dot tone-${item.presenceTone}`}
                          aria-hidden="true"
                        />
                      </div>
                      <div className="client-contact-copy">
                        <div className="client-contact-topline">
                          <strong>{item.contact.displayName}</strong>
                          <span>{item.timestampLabel}</span>
                        </div>
                        <p>{item.preview}</p>
                        <div className="client-contact-meta">
                          <span>{formatRole(item.contact.role)}</span>
                          <MessagePresenceBadge entry={item.presence} compact />
                          {item.unreadCount ? (
                            <span className="messages-unread-pill">
                              {item.unreadCount}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="client-contact-empty">
                    <div className="messages-empty-icon">
                      <MessageIcon className="messages-empty-icon-svg" />
                    </div>
                    <strong>No contacts found</strong>
                    <span>Try another search term.</span>
                  </div>
                )}
              </div>
            </aside>

            <MessagesThreadPanel
              connectionReady={connectionReady}
              deletingMessageId={deletingMessageId}
              editingMessageId={editingMessageId}
              isEditingMessage={isEditingMessage}
              loadingThread={loadingThread}
              messageBody={messageBody}
              messageClusters={messageClusters}
              selectedContact={selectedContact}
              selectedConversation={selectedConversation}
              selectedPresence={selectedPresence}
              sendingMessage={sendingMessage}
              threadReadSummary={threadReadSummary}
              onCancelEditingMessage={cancelEditingMessage}
              onComposerKeyDown={handleComposerKeyDown}
              onDeleteMessage={handleDeleteMessage}
              onMessageBodyChange={setMessageBody}
              onSendMessage={handleSendMessage}
              onStartEditingMessage={startEditingMessage}
              onStartVoiceCall={() => handleStartCall('voice')}
              onStartVideoCall={() => handleStartCall('video')}
              emptyStateCopy="Choose a contact to open a conversation."
            />
          </section>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      pageTitle="Messages"
      pageSubtitle="Slack-style direct messaging, live presence, and team-wide announcements without leaving the workspace."
      actions={
        <div className="messages-toolbar">
          <div className={`messages-toolbar-pill${connectionReady ? '' : ' offline'}`}>
            <span className="messages-toolbar-pill-label">Realtime</span>
            <strong>{connectionReady ? 'Connected' : 'Offline'}</strong>
          </div>
          <div className="messages-toolbar-pill">
            <span className="messages-toolbar-pill-label">Unread</span>
            <strong>{unreadThreadsCount}</strong>
          </div>
          <div className="messages-toolbar-pill">
            <span className="messages-toolbar-pill-label">Broadcasts</span>
            <strong>{isStaff ? broadcasts.length : 'Staff only'}</strong>
          </div>
        </div>
      }
    >
      <div className="messages-page-layout">
        {error ? <div className="error-message">{error}</div> : null}
        {flashMessage ? <div className="success-message">{flashMessage}</div> : null}

        <section className="messages-workspace">
          <MessagesSidebar
            connectionReady={connectionReady}
            conversationItems={conversationItems}
            loadingSidebar={loadingSidebar}
            refreshingSidebar={refreshingSidebar}
            searchTerm={searchTerm}
            selectedContactId={selectedContactId}
            unreadThreadsCount={unreadThreadsCount}
            onSearchChange={setSearchTerm}
            onSelectContact={selectContact}
          />

          <MessagesThreadPanel
            connectionReady={connectionReady}
            deletingMessageId={deletingMessageId}
            editingMessageId={editingMessageId}
            isEditingMessage={isEditingMessage}
            loadingThread={loadingThread}
            messageBody={messageBody}
            messageClusters={messageClusters}
            selectedContact={selectedContact}
            selectedConversation={selectedConversation}
            selectedPresence={selectedPresence}
            sendingMessage={sendingMessage}
            threadReadSummary={threadReadSummary}
            onCancelEditingMessage={cancelEditingMessage}
            onComposerKeyDown={handleComposerKeyDown}
            onDeleteMessage={handleDeleteMessage}
            onMessageBodyChange={setMessageBody}
            onSendMessage={handleSendMessage}
            onStartEditingMessage={startEditingMessage}
            onStartVoiceCall={() => handleStartCall('voice')}
            onStartVideoCall={() => handleStartCall('video')}
          />

          <MessagesDetailsRail
            availabilityItems={availabilityItems}
            broadcastAudience={broadcastAudience}
            broadcastBody={broadcastBody}
            broadcastTitle={broadcastTitle}
            broadcasts={broadcasts}
            connectionState={connectionState}
            isStaff={isStaff}
            loadingBroadcasts={loadingBroadcasts}
            selectedContact={selectedContact}
            selectedConversation={selectedConversation}
            selectedPresence={selectedPresence}
            sendingBroadcast={sendingBroadcast}
            threadMessageCount={messageClusters.reduce((sum, cluster) => sum + cluster.messages.length, 0)}
            threadReadSummary={threadReadSummary}
            onBroadcastAudienceChange={setBroadcastAudience}
            onBroadcastBodyChange={setBroadcastBody}
            onBroadcastTitleChange={setBroadcastTitle}
            onSelectContact={selectContact}
            onSendBroadcast={handleSendBroadcast}
          />
        </section>
      </div>
    </AppShell>
  );
}
