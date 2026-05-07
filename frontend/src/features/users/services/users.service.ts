import { gql, graphqlMutation, graphqlQuery } from '../../../shared/api/graphql';
import type {
  CreateManagedUserPayload,
  ManagedUser,
} from '../types/user-management.types';

const USERS = gql`
  query Users {
    users
  }
`;

const CREATE_USER = gql`
  mutation CreateUser($input: JSONObject!) {
    createUser(input: $input)
  }
`;

export const usersService = {
  async listUsers() {
    const result = await graphqlQuery<{ users: ManagedUser[] }>(USERS);
    return result.users;
  },

  async createUser(payload: CreateManagedUserPayload) {
    const result = await graphqlMutation<
      { createUser: ManagedUser },
      { input: CreateManagedUserPayload }
    >(CREATE_USER, { input: payload });
    return result.createUser;
  },
};
