import { API_URL } from './config';
import { gql, graphqlMutation } from './graphql';

const AUTH_REFRESH_MUTATION = gql`
  mutation AuthRefresh($input: JSONObject!) {
    authRefresh(input: $input)
  }
`;

interface RefreshResponse {
  authRefresh: {
    accessToken: string;
    refreshToken: string;
  };
}

interface ApiRequestOptions {
  skipAuthRefresh?: boolean;
}

class HttpRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly responseBody?: unknown,
  ) {
    super(message);
    this.name = 'HttpRequestError';
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options?: ApiRequestOptions,
): Promise<T> {
  return runWithAuthRefresh(async () => {
    const headers = new Headers(init.headers ?? {});
    const token = localStorage.getItem('accessToken');

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(resolveApiUrl(path), {
      ...init,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw await createHttpRequestError(response);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      return (await response.json()) as T;
    }

    return undefined as T;
  }, options);
}

async function runWithAuthRefresh<T>(
  operation: () => Promise<T>,
  options?: ApiRequestOptions,
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

async function createHttpRequestError(response: Response) {
  const responseBody = await parseResponseBody(response);
  const message = getResponseErrorMessage(responseBody, response.status);
  return new HttpRequestError(message, response.status, responseBody);
}

async function parseResponseBody(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    const text = await response.text();
    return text || null;
  } catch {
    return null;
  }
}

function getResponseErrorMessage(responseBody: unknown, status: number) {
  if (typeof responseBody === 'string' && responseBody.trim()) {
    return responseBody;
  }

  if (
    responseBody &&
    typeof responseBody === 'object' &&
    'message' in responseBody
  ) {
    const message = (responseBody as { message?: unknown }).message;

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    if (Array.isArray(message) && message.length) {
      return message.map((item) => String(item)).join(', ');
    }
  }

  return `Request failed with status ${status}.`;
}

function clearStoredAuth() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

function isUnauthorizedError(error: unknown) {
  return error instanceof HttpRequestError && error.status === 401;
}

function resolveApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (path.startsWith('/')) {
    return `${API_URL}${path}`;
  }

  return `${API_URL}/${path}`;
}
