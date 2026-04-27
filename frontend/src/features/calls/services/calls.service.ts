import api from '../../../shared/api/axios';
import type { CaptionSegment, RecordingItem } from '../../realtime/types/realtime.types';

export const callsService = {
  async createRecording(callId: string, payload: {
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
      formData.append('recording', payload.blob, `call-${callId}.webm`);
    }

    const { data } = await api.post<RecordingItem>(
      `/calls/${callId}/recordings`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },

  async createCaption(callId: string, payload: {
    text: string;
    sourceLanguage?: string;
    targetLanguage?: string;
    source?: 'manual' | 'browser_speech';
  }) {
    const { data } = await api.post<CaptionSegment>(
      `/calls/${callId}/captions`,
      payload,
    );
    return data;
  },

  async listCaptions(callId: string) {
    const { data } = await api.get<CaptionSegment[]>(`/calls/${callId}/captions`);
    return data;
  },
};
