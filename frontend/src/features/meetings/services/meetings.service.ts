import api from '../../../shared/api/axios';
import type {
  CaptionSegment,
  Meeting,
  MeetingNote,
  RealtimeUserSummary,
  RecordingItem,
} from '../../realtime/types/realtime.types';

export interface CreateMeetingPayload {
  title: string;
  agenda?: string;
  scheduledStartAt: string;
  durationMinutes: number;
  participantIds: string[];
}

export const meetingsService = {
  async list() {
    const { data } = await api.get<Meeting[]>('/meetings');
    return data;
  },

  async get(meetingId: string) {
    const { data } = await api.get<Meeting>(`/meetings/${meetingId}`);
    return data;
  },

  async create(payload: CreateMeetingPayload) {
    const { data } = await api.post<Meeting>('/meetings', payload);
    return data;
  },

  async listEligibleParticipants(search?: string) {
    const { data } = await api.get<RealtimeUserSummary[]>(
      '/meetings/eligible-participants',
      { params: search?.trim() ? { search: search.trim() } : undefined },
    );
    return data;
  },

  async join(meetingId: string) {
    const { data } = await api.post<Meeting>(`/meetings/${meetingId}/join`);
    return data;
  },

  async leave(meetingId: string) {
    const { data } = await api.post<Meeting>(`/meetings/${meetingId}/leave`);
    return data;
  },

  async end(meetingId: string) {
    const { data } = await api.post<Meeting>(`/meetings/${meetingId}/end`);
    return data;
  },

  async cancel(meetingId: string) {
    const { data } = await api.post<Meeting>(`/meetings/${meetingId}/cancel`);
    return data;
  },

  async listNotes(meetingId: string) {
    const { data } = await api.get<MeetingNote[]>(`/meetings/${meetingId}/notes`);
    return data;
  },

  async createNote(meetingId: string, content: string) {
    const { data } = await api.post<MeetingNote>(`/meetings/${meetingId}/notes`, {
      content,
    });
    return data;
  },

  async updateNote(meetingId: string, noteId: string, content: string) {
    const { data } = await api.patch<MeetingNote>(
      `/meetings/${meetingId}/notes/${noteId}`,
      { content },
    );
    return data;
  },

  async listRecordings(meetingId: string) {
    const { data } = await api.get<RecordingItem[]>(
      `/meetings/${meetingId}/recordings`,
    );
    return data;
  },

  async createRecording(meetingId: string, payload: {
    startedAt: string;
    endedAt: string;
    durationSeconds: number;
    mimeType?: string;
    blob?: Blob;
  }) {
    const formData = new FormData();
    formData.append('startedAt', payload.startedAt);
    formData.append('endedAt', payload.endedAt);
    formData.append('durationSeconds', String(payload.durationSeconds));

    if (payload.mimeType) {
      formData.append('mimeType', payload.mimeType);
    }

    if (payload.blob) {
      formData.append('recording', payload.blob, `meeting-${meetingId}.webm`);
    }

    const { data } = await api.post<RecordingItem>(
      `/meetings/${meetingId}/recordings`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },

  async createCaption(meetingId: string, payload: {
    text: string;
    sourceLanguage?: string;
    targetLanguage?: string;
    source?: 'manual' | 'browser_speech';
  }) {
    const { data } = await api.post<CaptionSegment>(
      `/meetings/${meetingId}/captions`,
      payload,
    );
    return data;
  },

  async listCaptions(meetingId: string) {
    const { data } = await api.get<CaptionSegment[]>(
      `/meetings/${meetingId}/captions`,
    );
    return data;
  },
};
