import api from '../../../shared/api/axios';
import type {
  NotificationItem,
  NotificationsReadAllPayload,
} from '../../realtime/types/realtime.types';

export const notificationsService = {
  async list(limit = 20) {
    const { data } = await api.get<NotificationItem[]>('/notifications', {
      params: { limit },
    });
    return data;
  },

  async markRead(notificationId: string) {
    const { data } = await api.patch<NotificationItem>(
      `/notifications/${notificationId}/read`,
    );
    return data;
  },

  async markAllRead() {
    const { data } = await api.post<NotificationsReadAllPayload>(
      '/notifications/read-all',
    );
    return data;
  },
};
