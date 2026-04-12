import api from '../../../shared/api/axios';
import type {
  BroadcastMessage,
  ChatThreadSummary,
  DirectMessage,
  RealtimeUserSummary,
} from '../../realtime/types/realtime.types';

export const messagesService = {
  async listContacts(search?: string) {
    const { data } = await api.get<RealtimeUserSummary[]>('/messages/contacts', {
      params: search?.trim() ? { search: search.trim() } : undefined,
    });
    return data;
  },

  async listThreads() {
    const { data } = await api.get<ChatThreadSummary[]>('/messages/threads');
    return data;
  },

  async listThread(contactId: string, limit = 100) {
    const { data } = await api.get<DirectMessage[]>(
      `/messages/threads/${contactId}`,
      {
        params: { limit },
      },
    );
    return data;
  },

  async listBroadcasts(limit = 20) {
    const { data } = await api.get<BroadcastMessage[]>('/messages/broadcasts', {
      params: { limit },
    });
    return data;
  },
};
