import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { CallSessionModal } from '../../features/calls/components/CallSessionModal';
import { useRealtime } from '../../features/realtime/hooks/useRealtime';
import {
  getNotificationInitial,
  getNotificationTargetPath,
  getNotificationToneLabel,
} from '../../features/notifications/utils/notification-ui';
import { formatDateTime, formatRole } from '../utils/format';
import {
  BellIcon,
  ChevronDownIcon,
  LogoIcon,
  LogoutIcon,
  ShieldIcon,
  UserIcon,
} from './AppIcons';
import { getNavigationForRole } from '../navigation/app-navigation';

interface AppShellProps {
  pageTitle: string;
  pageSubtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function AppShell({
  pageTitle,
  pageSubtitle,
  actions,
  children,
}: AppShellProps) {
  const { user, logout } = useAuth();
  const {
    connectionState,
    activeCall,
    dismissActiveCall,
    dismissToast,
    markAllNotificationsRead,
    markNotificationRead,
    notifications,
    toasts,
    unreadMessagingCount,
    unreadNotificationCount,
  } = useRealtime();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  if (!user) {
    return null;
  }

  const navigation = getNavigationForRole(user.role);
  const displayName =
    `${user.firstName} ${user.lastName}`.trim() || user.email.split('@')[0];
  const visibleNotifications = notifications
    .filter((notification) => !notification.isResolved)
    .slice(0, 5);

  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar">
        <div className="workspace-brand">
          <LogoIcon className="workspace-logo-mark" />
          <div>
            <div className="workspace-logo-text">PharmaFlow</div>
            <div className="workspace-logo-subtitle">Pharmacy ERP System</div>
          </div>
        </div>

        <nav className="workspace-nav">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `workspace-nav-link${isActive ? ' active' : ''}`
              }
            >
              {item.icon}
              <span>{item.label}</span>
              {item.to === '/messages' && unreadMessagingCount ? (
                <span className="workspace-nav-badge" aria-label="Unread messages">
                  {unreadMessagingCount > 9 ? '9+' : unreadMessagingCount}
                </span>
              ) : null}
              {item.to === '/notifications' && unreadNotificationCount ? (
                <span className="workspace-nav-badge" aria-label="Unread notifications">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="workspace-sidebar-footer">
          <div className="workspace-user-chip">
            <UserIcon className="workspace-mini-icon" />
            <div>
              <strong>{displayName}</strong>
              <span>{formatRole(user.role)}</span>
            </div>
          </div>
          <button
            type="button"
            className="workspace-icon-button"
            onClick={logout}
            aria-label="Sign out"
          >
            <LogoutIcon className="workspace-mini-icon" />
          </button>
        </div>
      </aside>

      <main className="workspace-main">
        <header className="workspace-topbar">
          <div>
            <div className="workspace-page-eyebrow">Pharma & Analytics</div>
            <h1>{pageTitle}</h1>
            {pageSubtitle ? (
              <p className="workspace-page-subtitle">{pageSubtitle}</p>
            ) : null}
          </div>

          <div className="workspace-topbar-right">
            {actions}
            <div className="workspace-utility-group">
              <button
                type="button"
                className="workspace-utility workspace-utility-bell"
                aria-label="Open notifications"
                onClick={() => setNotificationsOpen((current) => !current)}
              >
                <BellIcon className="workspace-mini-icon" />
                {unreadNotificationCount ? (
                  <span className="workspace-utility-badge">
                    {unreadNotificationCount}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                className="workspace-utility"
                aria-label="Open security settings"
                onClick={() => navigate('/settings')}
              >
                <ShieldIcon className="workspace-mini-icon" />
              </button>
            </div>
            {notificationsOpen ? (
              <div className="workspace-notification-drawer">
                <div className="workspace-notification-header">
                  <div>
                    <span className="surface-card-eyebrow">Notifications</span>
                    <strong>{unreadNotificationCount} unread</strong>
                  </div>
                  <span className={`notification-connection ${connectionState}`}>
                    {connectionState === 'connected' ? 'Live' : 'Syncing'}
                  </span>
                </div>

                {visibleNotifications.length ? (
                  <div className="workspace-notification-list">
                    {visibleNotifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        className={`workspace-notification-item notification-${notification.severity}${
                          notification.isRead ? '' : ' unread'
                        }`}
                        onClick={() => {
                          if (!notification.isRead) {
                            void markNotificationRead(notification.id);
                          }

                          const targetPath = getNotificationTargetPath(notification);
                          if (targetPath) {
                            navigate(targetPath);
                          }

                          setNotificationsOpen(false);
                        }}
                      >
                        <span className="workspace-notification-icon">
                          {getNotificationInitial(notification)}
                        </span>
                        <div className="workspace-notification-title">
                          <div>
                            <strong>{notification.title}</strong>
                            <span>{formatDateTime(notification.createdAt)}</span>
                          </div>
                          <small>{getNotificationToneLabel(notification.severity)}</small>
                        </div>
                        <p>{notification.body}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="surface-empty">
                    No live notifications yet.
                  </div>
                )}
                <div className="workspace-notification-footer">
                  <button
                    type="button"
                    className="workspace-inline-link"
                    onClick={() => {
                      void markAllNotificationsRead();
                    }}
                    disabled={!unreadNotificationCount}
                  >
                    Mark all read
                  </button>
                  <button
                    type="button"
                    className="workspace-primary-action"
                    onClick={() => {
                      setNotificationsOpen(false);
                      navigate('/notifications');
                    }}
                  >
                    Open center
                  </button>
                </div>
              </div>
            ) : null}
            <button
              type="button"
              className="workspace-profile"
              onClick={() => navigate('/settings')}
              aria-label="Open profile settings"
            >
              <div className="workspace-profile-avatar">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="workspace-profile-copy">
                <span>Welcome</span>
                <strong>{displayName}</strong>
              </div>
              <ChevronDownIcon className="workspace-mini-icon" />
            </button>
          </div>
        </header>

        <div className="workspace-content">{children}</div>
      </main>

      {toasts.length ? (
        <div className="workspace-toast-stack">
          {toasts.map((toast) => (
            <button
              key={toast.id}
              type="button"
              className={`workspace-toast workspace-toast-${toast.tone}`}
              onClick={() => dismissToast(toast.id)}
            >
              <strong>{toast.title}</strong>
              <span>{toast.body}</span>
            </button>
          ))}
        </div>
      ) : null}

      {activeCall ? (
        <CallSessionModal
          key={activeCall.id}
          call={activeCall}
          onClose={dismissActiveCall}
        />
      ) : null}
    </div>
  );
}
