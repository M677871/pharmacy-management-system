import { gql, graphqlQuery } from '../../../shared/api/graphql';
import type {
  BroadcastMessage,
  ChatThreadSummary,
  DirectMessage,
  RealtimeUserSummary,
} from '../../realtime/types/realtime.types';

const MESSAGE_CONTACTS = gql`
  query MessageContacts($input: JSONObject) {
    messageContacts(input: $input)
  }
`;
const MESSAGE_THREADS = gql`
  query MessageThreads {
    messageThreads
  }
`;
const MESSAGE_THREAD = gql`
  query MessageThread($contactId: ID!, $input: JSONObject) {
    messageThread(contactId: $contactId, input: $input)
  }
`;
const BROADCAST_MESSAGES = gql`
  query BroadcastMessages($input: JSONObject) {
    broadcastMessages(input: $input)
  }
`;

export const messagesService = {
  async listContacts(search?: string) {
    const result = await graphqlQuery<
      { messageContacts: RealtimeUserSummary[] },
      { input?: { search?: string } }
    >(
      MESSAGE_CONTACTS,
      search?.trim()
        ? {
            input: { search: search.trim() },
          }
        : undefined,
    );
    return result.messageContacts;
  },

  async listThreads() {
    const result = await graphqlQuery<{ messageThreads: ChatThreadSummary[] }>(
      MESSAGE_THREADS,
    );
    return result.messageThreads;
  },

  async listThread(contactId: string, limit = 100) {
    const result = await graphqlQuery<
      { messageThread: DirectMessage[] },
      { contactId: string; input: { limit: number } }
    >(MESSAGE_THREAD, {
      contactId,
      input: { limit },
    });
    return result.messageThread;
  },

  async listBroadcasts(limit = 20) {
    const result = await graphqlQuery<
      { broadcastMessages: BroadcastMessage[] },
      { input: { limit: number } }
    >(BROADCAST_MESSAGES, { input: { limit } });
    return result.broadcastMessages;
  },
};
