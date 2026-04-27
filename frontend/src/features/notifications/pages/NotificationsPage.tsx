import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../../shared/components/AppShell';
import { BellIcon } from '../../../shared/components/AppIcons';
import { formatDateTime } from '../../../shared/utils/format';
import { useRealtime } from '../../realtime/hooks/useRealtime';
import type { NotificationItem } from '../../realtime/types/realtime.types';
import {
  filterNotifications,
  getNotificationInitial,
  getNotificationTargetPath,
  getNotificationToneLabel,
  getNotificationTypeLabel,
  type NotificationFilter,
} from '../utils/notification-ui';

const filters: Array<{ id: NotificationFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'priority', label: 'Priority' },
  { id: 'calls', label: 'Calls' },
  { id: 'meetings', label: 'Meetings' },
];

function isToday(value: string) {
  const date = new Date(value);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const {
    connectionState,
    markAllNotificationsRead,
    markNotificationRead,
    notifications,
    refreshNotifications,
    unreadNotificationCount,
  } = useRealtime();
  const [filter, setFilter] = useState<NotificationFilter>('all');

  useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications]);

  const visibleNotifications = useMemo(
    () =>
      filterNotifications(
        notifications.filter((notification) => !notification.isResolved),
        filter,
      ),
    [filter, notifications],
  );
  const todayCount = notifications.filter((notification) =>
    isToday(notification.createdAt),
  ).length;
  const priorityCount = notifications.filter((notification) =>
    ['critical', 'warning'].includes(notification.severity),
  ).length;

  async function openNotification(notification: NotificationItem) {
    if (!notification.isRead) {
      await markNotificationRead(notification.id).catch(() => {
        return;
      });
    }

    const targetPath = getNotificationTargetPath(notification);

    if (targetPath) {
      navigate(targetPath);
    }
  }

  return (
    <AppShell
      pageTitle="Notifications"
      pageSubtitle="A focused inbox for calls, meetings, inventory alerts, orders, and system updates."
      actions={
        <div className="messages-toolbar">
          <div className={`messages-toolbar-pill${connectionState === 'connected' ? '' : ' offline'}`}>
            <span className="messages-toolbar-pill-label">Realtime</span>
            <strong>{connectionState === 'connected' ? 'Connected' : 'Syncing'}</strong>
          </div>
          <button
            type="button"
            className="workspace-secondary-action"
            onClick={() => {
              void markAllNotificationsRead();
            }}
            disabled={!unreadNotificationCount}
          >
            Mark all read
          </button>
        </div>
      }
    >
      <section className="notification-center">
        <div className="notification-metrics">
          <article className="notification-metric-card primary">
            <span>Unread</span>
            <strong>{unreadNotificationCount}</strong>
          </article>
          <article className="notification-metric-card">
            <span>Today</span>
            <strong>{todayCount}</strong>
          </article>
          <article className="notification-metric-card warning">
            <span>Priority</span>
            <strong>{priorityCount}</strong>
          </article>
          <article className="notification-metric-card">
            <span>Total</span>
            <strong>{notifications.length}</strong>
          </article>
        </div>

        <article className="surface-card notification-center-card">
          <div className="notification-center-toolbar">
            <div>
              <span className="surface-card-eyebrow">Inbox</span>
              <h2>Notification center</h2>
            </div>
            <div className="notification-filter-tabs" role="tablist" aria-label="Notification filters">
              {filters.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={filter === item.id ? 'active' : ''}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {visibleNotifications.length ? (
            <div className="notification-list-page">
              {visibleNotifications.map((notification) => {
                const targetPath = getNotificationTargetPath(notification);

                return (
                  <article
                    key={notification.id}
                    className={`notification-row notification-${notification.severity}${
                      notification.isRead ? '' : ' unread'
                    }`}
                  >
                    <div className="notification-row-icon">
                      {getNotificationInitial(notification)}
                    </div>
                    <div className="notification-row-content">
                      <div className="notification-row-header">
                        <strong>{notification.title}</strong>
                        <span>{formatDateTime(notification.createdAt)}</span>
                      </div>
                      <p>{notification.body}</p>
                      <div className="notification-row-meta">
                        <span>{getNotificationToneLabel(notification.severity)}</span>
                        <span>{getNotificationTypeLabel(notification.type)}</span>
                        {!notification.isRead ? <span>Unread</span> : <span>Read</span>}
                      </div>
                    </div>
                    <div className="notification-row-actions">
                      {!notification.isRead ? (
                        <button
                          type="button"
                          className="workspace-inline-link"
                          onClick={() => {
                            void markNotificationRead(notification.id);
                          }}
                        >
                          Mark read
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="workspace-secondary-action"
                        onClick={() => {
                          void openNotification(notification);
                        }}
                      >
                        {targetPath ? 'Open' : 'View'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="notification-empty-state">
              <BellIcon className="notification-empty-icon" />
              <strong>No notifications in this view</strong>
              <span>New calls, meetings, inventory alerts, and order updates will appear here.</span>
            </div>
          )}
        </article>
      </section>
    </AppShell>
  );
}
