const configuredApiUrl = import.meta.env.VITE_API_URL;

if (!configuredApiUrl) {
  throw new Error('VITE_API_URL must be configured.');
}

export const API_URL = configuredApiUrl.replace(/\/+$/, '');
export const GRAPHQL_URL =
  import.meta.env.VITE_GRAPHQL_URL || `${API_URL}/graphql`;
export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  API_URL.replace(/\/api\/?$/, '');
