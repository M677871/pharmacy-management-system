import { gql, graphqlMutation, graphqlQuery } from '../../../shared/api/graphql';
import type {
  NotificationItem,
  NotificationsReadAllPayload,
} from '../../realtime/types/realtime.types';

const NOTIFICATIONS = gql`
  query Notifications($input: JSONObject) {
    notifications(input: $input)
  }
`;

const MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationRead($notificationId: ID!) {
    markNotificationRead(notificationId: $notificationId)
  }
`;

const MARK_ALL_NOTIFICATIONS_READ = gql`
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`;

export const notificationsService = {
  async list(limit = 20) {
    const result = await graphqlQuery<
      { notifications: NotificationItem[] },
      { input: { limit: number } }
    >(NOTIFICATIONS, { input: { limit } });
    return result.notifications;
  },

  async markRead(notificationId: string) {
    const result = await graphqlMutation<
      { markNotificationRead: NotificationItem },
      { notificationId: string }
    >(MARK_NOTIFICATION_READ, { notificationId });
    return result.markNotificationRead;
  },

  async markAllRead() {
    const result = await graphqlMutation<{
      markAllNotificationsRead: NotificationsReadAllPayload;
    }>(MARK_ALL_NOTIFICATIONS_READ);
    return result.markAllNotificationsRead;
  },
};
