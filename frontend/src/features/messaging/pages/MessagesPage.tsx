import { AppShell } from '../../../shared/components/AppShell';
import { useMessagingWorkspace } from '../hooks/useMessagingWorkspace';
import { MessagesDetailsRail } from '../components/MessagesDetailsRail';
import { MessagesSidebar } from '../components/MessagesSidebar';
import { MessagesThreadPanel } from '../components/MessagesThreadPanel';

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
