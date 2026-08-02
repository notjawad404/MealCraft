const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Thin wrapper around fetch that speaks the backend's JSON conventions:
 * success bodies are returned as-is, failures throw an ApiError carrying the
 * server's `message` field.
 */
export async function apiRequest(path, { method = 'GET', body, token, signal } = {}) {
  let response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      signal,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      'Could not reach the server. Check that the backend is running.',
      0,
    );
  }

  const raw = await response.text();
  let data = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      data?.message || `Request failed (${response.status})`,
      response.status,
    );
  }

  return data;
}

export const authApi = {
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => apiRequest('/auth/login', { method: 'POST', body: payload }),
};
