import { gql, graphqlMutation, graphqlQuery } from '../../../shared/api/graphql';
import { apiRequest } from '../../../shared/api/http';
import { createRecordingUploadFormData } from '../../../shared/api/recordings';
import type {
  CallSession,
  CaptionSegment,
  RecordingItem,
} from '../../realtime/types/realtime.types';

const CREATE_CALL_CAPTION = gql`
  mutation CreateCallCaption($callId: ID!, $input: JSONObject!) {
    createCallCaption(callId: $callId, input: $input)
  }
`;
const CALL_CAPTIONS = gql`
  query CallCaptions($callId: ID!) {
    callCaptions(callId: $callId)
  }
`;

export const callsService = {
  async createRecording(callId: string, payload: {
    startedAt: string;
    endedAt: string;
    durationSeconds: number;
    mimeType?: string;
    blob?: Blob;
  }) {
    return apiRequest<RecordingItem>(`/calls/${callId}/recordings`, {
      method: 'POST',
      body: createRecordingUploadFormData(`call-${callId}`, payload),
    });
  },

  async endCall(callId: string) {
    return apiRequest<CallSession>(`/calls/${callId}/end`, {
      method: 'POST',
    });
  },

  async failCall(callId: string) {
    return apiRequest<CallSession>(`/calls/${callId}/fail`, {
      method: 'POST',
    });
  },

  async createCaption(callId: string, payload: {
    text: string;
    sourceLanguage?: string;
    targetLanguage?: string;
    source?: 'manual' | 'browser_speech';
  }) {
    const result = await graphqlMutation<
      { createCallCaption: CaptionSegment },
      { callId: string; input: typeof payload }
    >(CREATE_CALL_CAPTION, { callId, input: payload });
    return result.createCallCaption;
  },

  async listCaptions(callId: string) {
    const result = await graphqlQuery<
      { callCaptions: CaptionSegment[] },
      { callId: string }
    >(CALL_CAPTIONS, { callId });
    return result.callCaptions;
  },
};
