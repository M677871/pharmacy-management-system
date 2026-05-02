import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
  gql,
  type DocumentNode,
  type OperationVariables,
} from '@apollo/client/core';
import { GRAPHQL_URL } from './config';

interface RefreshResponse {
  authRefresh: {
    accessToken: string;
    refreshToken: string;
  };
}

const authLink = new ApolloLink((operation, forward) => {
  const token = localStorage.getItem('accessToken');

  operation.setContext(({ headers = {} }) => ({
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }));

  return forward(operation);
});

export const apolloClient = new ApolloClient({
  cache: new InMemoryCache(),
  link: ApolloLink.from([
    authLink,
    new HttpLink({
      uri: GRAPHQL_URL,
      credentials: 'include',
    }),
  ]),
  defaultOptions: {
    query: {
      fetchPolicy: 'no-cache',
      errorPolicy: 'none',
    },
    mutate: {
      errorPolicy: 'none',
    },
    watchQuery: {
      fetchPolicy: 'no-cache',
      errorPolicy: 'none',
    },
  },
});

const AUTH_REFRESH_MUTATION = gql`
  mutation AuthRefresh($input: JSONObject!) {
    authRefresh(input: $input)
  }
`;

interface GraphqlRequestOptions {
  skipAuthRefresh?: boolean;
}

export async function graphqlQuery<
  TData,
  TVariables extends OperationVariables = OperationVariables,
>(
  query: DocumentNode,
  variables?: TVariables,
  options?: GraphqlRequestOptions,
): Promise<TData> {
  return runWithAuthRefresh(
    async () => {
      const queryOptions = {
        query,
        ...(variables === undefined ? {} : { variables }),
      } as Parameters<typeof apolloClient.query<TData, TVariables>>[0];
      const result = await apolloClient.query<TData, TVariables>(queryOptions);

      if (!result.data) {
        throw new Error('GraphQL query returned no data.');
      }

      return result.data;
    },
    options,
  );
}

export async function graphqlMutation<
  TData,
  TVariables extends OperationVariables = OperationVariables,
>(
  mutation: DocumentNode,
  variables?: TVariables,
  options?: GraphqlRequestOptions,
): Promise<TData> {
  return runWithAuthRefresh(
    async () => {
      const mutationOptions = {
        mutation,
        ...(variables === undefined ? {} : { variables }),
      } as Parameters<typeof apolloClient.mutate<TData, TVariables>>[0];
      const result = await apolloClient.mutate<TData, TVariables>(
        mutationOptions,
      );

      if (!result.data) {
        throw new Error('GraphQL mutation returned no data.');
      }

      return result.data;
    },
    options,
  );
}

async function runWithAuthRefresh<T>(
  operation: () => Promise<T>,
  options?: GraphqlRequestOptions,
) {
  try {
    return await operation();
  } catch (error) {
    if (options?.skipAuthRefresh || !isUnauthorizedError(error)) {
      throw error;
    }

    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      clearStoredAuth();
      throw error;
    }

    try {
      const data = await graphqlMutation<
        RefreshResponse,
        { input: { refreshToken: string } }
      >(
        AUTH_REFRESH_MUTATION,
        { input: { refreshToken } },
        { skipAuthRefresh: true },
      );

      localStorage.setItem('accessToken', data.authRefresh.accessToken);
      localStorage.setItem('refreshToken', data.authRefresh.refreshToken);
      return await operation();
    } catch (refreshError) {
      clearStoredAuth();

      if (window.location.pathname !== '/auth/login') {
        window.location.href = '/auth/login';
      }

      throw refreshError;
    }
  }
}

function clearStoredAuth() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

function isUnauthorizedError(error: unknown) {
  const graphQLErrors = getGraphQLErrors(error);

  if (
    graphQLErrors.some((graphQLError) => {
      const code = graphQLError.extensions?.code;
      const status = graphQLError.extensions?.status;
      return code === 'UNAUTHENTICATED' || status === 401;
    })
  ) {
    return true;
  }

  const networkError = (error as { networkError?: { statusCode?: number; status?: number } })
    ?.networkError;
  return networkError?.statusCode === 401 || networkError?.status === 401;
}

function getGraphQLErrors(error: unknown) {
  const maybeApolloError = error as {
    graphQLErrors?: Array<{
      extensions?: {
        code?: string;
        status?: number;
      };
    }>;
    errors?: Array<{
      extensions?: {
        code?: string;
        status?: number;
      };
    }>;
  };

  return maybeApolloError.graphQLErrors ?? maybeApolloError.errors ?? [];
}

export { gql };
