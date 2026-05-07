import { gql, graphqlMutation, graphqlQuery } from '../../../shared/api/graphql';
import { apiRequest } from '../../../shared/api/http';
import { createRecordingUploadFormData } from '../../../shared/api/recordings';
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

const MEETINGS = gql`query Meetings { meetings }`;
const MEETING = gql`
  query Meeting($meetingId: ID!) {
    meeting(meetingId: $meetingId)
  }
`;
const CREATE_MEETING = gql`
  mutation CreateMeeting($input: JSONObject!) {
    createMeeting(input: $input)
  }
`;
const ELIGIBLE_MEETING_PARTICIPANTS = gql`
  query EligibleMeetingParticipants($search: String) {
    eligibleMeetingParticipants(search: $search)
  }
`;
const JOIN_MEETING = gql`
  mutation JoinMeeting($meetingId: ID!) {
    joinMeeting(meetingId: $meetingId)
  }
`;
const LEAVE_MEETING = gql`
  mutation LeaveMeeting($meetingId: ID!) {
    leaveMeeting(meetingId: $meetingId)
  }
`;
const END_MEETING = gql`
  mutation EndMeeting($meetingId: ID!) {
    endMeeting(meetingId: $meetingId)
  }
`;
const CANCEL_MEETING = gql`
  mutation CancelMeeting($meetingId: ID!) {
    cancelMeeting(meetingId: $meetingId)
  }
`;
const MEETING_NOTES = gql`
  query MeetingNotes($meetingId: ID!) {
    meetingNotes(meetingId: $meetingId)
  }
`;
const CREATE_MEETING_NOTE = gql`
  mutation CreateMeetingNote($meetingId: ID!, $input: JSONObject!) {
    createMeetingNote(meetingId: $meetingId, input: $input)
  }
`;
const UPDATE_MEETING_NOTE = gql`
  mutation UpdateMeetingNote($meetingId: ID!, $noteId: ID!, $input: JSONObject!) {
    updateMeetingNote(meetingId: $meetingId, noteId: $noteId, input: $input)
  }
`;
const MEETING_RECORDINGS = gql`
  query MeetingRecordings($meetingId: ID!) {
    meetingRecordings(meetingId: $meetingId)
  }
`;
const CREATE_MEETING_CAPTION = gql`
  mutation CreateMeetingCaption($meetingId: ID!, $input: JSONObject!) {
    createMeetingCaption(meetingId: $meetingId, input: $input)
  }
`;
const MEETING_CAPTIONS = gql`
  query MeetingCaptions($meetingId: ID!) {
    meetingCaptions(meetingId: $meetingId)
  }
`;

export const meetingsService = {
  async list() {
    const result = await graphqlQuery<{ meetings: Meeting[] }>(MEETINGS);
    return result.meetings;
  },

  async get(meetingId: string) {
    const result = await graphqlQuery<
      { meeting: Meeting },
      { meetingId: string }
    >(MEETING, { meetingId });
    return result.meeting;
  },

  async create(payload: CreateMeetingPayload) {
    const result = await graphqlMutation<
      { createMeeting: Meeting },
      { input: CreateMeetingPayload }
    >(CREATE_MEETING, { input: payload });
    return result.createMeeting;
  },

  async listEligibleParticipants(search?: string) {
    const result = await graphqlQuery<
      { eligibleMeetingParticipants: RealtimeUserSummary[] },
      { search?: string }
    >(ELIGIBLE_MEETING_PARTICIPANTS, {
      search: search?.trim() || undefined,
    });
    return result.eligibleMeetingParticipants;
  },

  async join(meetingId: string) {
    const result = await graphqlMutation<
      { joinMeeting: Meeting },
      { meetingId: string }
    >(JOIN_MEETING, { meetingId });
    return result.joinMeeting;
  },

  async leave(meetingId: string) {
    const result = await graphqlMutation<
      { leaveMeeting: Meeting },
      { meetingId: string }
    >(LEAVE_MEETING, { meetingId });
    return result.leaveMeeting;
  },

  async end(meetingId: string) {
    const result = await graphqlMutation<
      { endMeeting: Meeting },
      { meetingId: string }
    >(END_MEETING, { meetingId });
    return result.endMeeting;
  },

  async cancel(meetingId: string) {
    const result = await graphqlMutation<
      { cancelMeeting: Meeting },
      { meetingId: string }
    >(CANCEL_MEETING, { meetingId });
    return result.cancelMeeting;
  },

  async listNotes(meetingId: string) {
    const result = await graphqlQuery<
      { meetingNotes: MeetingNote[] },
      { meetingId: string }
    >(MEETING_NOTES, { meetingId });
    return result.meetingNotes;
  },

  async createNote(meetingId: string, content: string) {
    const result = await graphqlMutation<
      { createMeetingNote: MeetingNote },
      { meetingId: string; input: { content: string } }
    >(CREATE_MEETING_NOTE, { meetingId, input: { content } });
    return result.createMeetingNote;
  },

  async updateNote(meetingId: string, noteId: string, content: string) {
    const result = await graphqlMutation<
      { updateMeetingNote: MeetingNote },
      { meetingId: string; noteId: string; input: { content: string } }
    >(UPDATE_MEETING_NOTE, { meetingId, noteId, input: { content } });
    return result.updateMeetingNote;
  },

  async listRecordings(meetingId: string) {
    const result = await graphqlQuery<
      { meetingRecordings: RecordingItem[] },
      { meetingId: string }
    >(MEETING_RECORDINGS, { meetingId });
    return result.meetingRecordings;
  },

  async createRecording(meetingId: string, payload: {
    startedAt: string;
    endedAt: string;
    durationSeconds: number;
    mimeType?: string;
    blob?: Blob;
  }) {
    return apiRequest<RecordingItem>(`/meetings/${meetingId}/recordings`, {
      method: 'POST',
      body: createRecordingUploadFormData(`meeting-${meetingId}`, payload),
    });
  },

  async createCaption(meetingId: string, payload: {
    text: string;
    sourceLanguage?: string;
    targetLanguage?: string;
    source?: 'manual' | 'browser_speech';
  }) {
    const result = await graphqlMutation<
      { createMeetingCaption: CaptionSegment },
      { meetingId: string; input: typeof payload }
    >(CREATE_MEETING_CAPTION, { meetingId, input: payload });
    return result.createMeetingCaption;
  },

  async listCaptions(meetingId: string) {
    const result = await graphqlQuery<
      { meetingCaptions: CaptionSegment[] },
      { meetingId: string }
    >(MEETING_CAPTIONS, { meetingId });
    return result.meetingCaptions;
  },
};
