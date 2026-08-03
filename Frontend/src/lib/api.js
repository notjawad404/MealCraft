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
  } catch (err) {
    // A cancelled request is the caller superseding itself, not a failure —
    // it must stay distinguishable so callers can ignore it.
    if (err?.name === 'AbortError') throw err;
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

/** Serialises the list controls into the query string the backend expects. */
function listQuery({ search, sort, page, limit }) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (sort) params.set('sort', sort);
  if (page && page > 1) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const recipeApi = {
  create: (payload, token) => apiRequest('/recipe', { method: 'POST', body: payload, token }),

  /** Public recipes. Returns `{ recipes, page, pages, total, limit }`. */
  list: ({ signal, ...options } = {}) => apiRequest(`/recipe${listQuery(options)}`, { signal }),

  /** The signed-in user's own recipes, public and private. */
  mine: (token, { signal, ...options } = {}) =>
    apiRequest(`/recipe/user${listQuery(options)}`, { token, signal }),

  /** Up to five matching titles, for the search box. `{ suggestions: [...] }`. */
  suggest: ({ search, signal } = {}) =>
    apiRequest(`/recipe/suggest?search=${encodeURIComponent(search ?? '')}`, { signal }),

  suggestMine: (token, { search, signal } = {}) =>
    apiRequest(`/recipe/user/suggest?search=${encodeURIComponent(search ?? '')}`, { token, signal }),
};
