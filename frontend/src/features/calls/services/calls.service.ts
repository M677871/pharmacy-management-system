import { gql, graphqlMutation, graphqlQuery } from '../../../shared/api/graphql';
import type { CaptionSegment, RecordingItem } from '../../realtime/types/realtime.types';

const CREATE_CALL_RECORDING = gql`
  mutation CreateCallRecording($callId: ID!, $input: JSONObject!) {
    createCallRecording(callId: $callId, input: $input)
  }
`;
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
    const recordingBase64 = payload.blob
      ? await blobToDataUrl(payload.blob)
      : undefined;
    const result = await graphqlMutation<
      { createCallRecording: RecordingItem },
      {
        callId: string;
        input: {
          startedAt: string;
          endedAt: string;
          durationSeconds: number;
          mimeType?: string;
          recordingBase64?: string;
          fileName?: string;
        };
      }
    >(CREATE_CALL_RECORDING, {
      callId,
      input: {
        startedAt: payload.startedAt,
        endedAt: payload.endedAt,
        durationSeconds: payload.durationSeconds,
        mimeType: payload.mimeType,
        recordingBase64,
        fileName: `call-${callId}.webm`,
      },
    });
    return result.createCallRecording;
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

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
