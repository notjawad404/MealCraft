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
function listQuery({ search, sort, page, limit, mealType, region, country, diet, exclude, maxCalories, maxTime }) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (sort) params.set('sort', sort);
  if (page && page > 1) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));

  if (mealType) params.set('mealType', Array.isArray(mealType) ? mealType.join(',') : mealType);
  if (region) params.set('region', Array.isArray(region) ? region.join(',') : region);
  if (country) params.set('country', Array.isArray(country) ? country.join(',') : country);
  if (diet) params.set('diet', Array.isArray(diet) ? diet.join(',') : diet);
  if (exclude) params.set('exclude', Array.isArray(exclude) ? exclude.join(',') : exclude);
  if (maxCalories) params.set('maxCalories', String(maxCalories));
  if (maxTime) params.set('maxTime', String(maxTime));

  const query = params.toString();
  return query ? `?${query}` : '';
}

export const recipeApi = {
  create: (payload, token) => apiRequest('/recipe', { method: 'POST', body: payload, token }),

  /**
   * Change a recipe you own. Only the keys sent are touched, so this backs both
   * the edit form — which sends the lot — and the visibility toggle, which
   * sends `{ isPublic }` on its own.
   */
  update: (id, payload, token) =>
    apiRequest(`/recipe/${id}`, { method: 'PUT', body: payload, token }),

  /** Delete a recipe you own, along with everyone's saves of it. */
  remove: (id, token) => apiRequest(`/recipe/${id}`, { method: 'DELETE', token }),

  /** Public recipes. Returns `{ recipes, page, pages, total, limit }`. */
  list: ({ signal, ...options } = {}) => apiRequest(`/recipe${listQuery(options)}`, { signal }),

  /**
   * One whole recipe. Listings leave out the method and the full-size image to
   * keep a page of twenty small, so anything showing a recipe in full has to
   * come back for it.
   *
   * The token is optional and worth sending whenever there is one: without it
   * the API cannot tell the author of a private recipe from a stranger, and
   * answers 404 to both.
   */
  get: (id, { token, signal } = {}) => apiRequest(`/recipe/${id}`, { token, signal }),

  /** The signed-in user's own recipes, public and private. */
  mine: (token, { signal, ...options } = {}) =>
    apiRequest(`/recipe/user${listQuery(options)}`, { token, signal }),

  /** Up to five matching titles, for the search box. `{ suggestions: [...] }`. */
  suggest: ({ search, signal } = {}) =>
    apiRequest(`/recipe/suggest?search=${encodeURIComponent(search ?? '')}`, { signal }),

  suggestMine: (token, { search, signal } = {}) =>
    apiRequest(`/recipe/user/suggest?search=${encodeURIComponent(search ?? '')}`, { token, signal }),

  /*
   * Likes and favourites. No page uses these yet — they are the API the
   * favourites and likes pages will be built on.
   *
   * Setting and clearing are separate calls rather than one toggle, so a
   * double-tapped heart cannot land back where it started: every one of these
   * can be sent twice and mean the same thing. Each answers with the flag and
   * the recipe's new total, e.g. `{ liked: true, likeCount: 12 }`.
   */
  like: (id, token) => apiRequest(`/recipe/${id}/like`, { method: 'PUT', token }),
  unlike: (id, token) => apiRequest(`/recipe/${id}/like`, { method: 'DELETE', token }),
  favourite: (id, token) => apiRequest(`/recipe/${id}/favourite`, { method: 'PUT', token }),
  unfavourite: (id, token) => apiRequest(`/recipe/${id}/favourite`, { method: 'DELETE', token }),

  /** Both paged like every other listing: `{ recipes, page, pages, total }`. */
  liked: (token, { signal, ...options } = {}) =>
    apiRequest(`/recipe/saved/likes${listQuery(options)}`, { token, signal }),
  favourites: (token, { signal, ...options } = {}) =>
    apiRequest(`/recipe/saved/favourites${listQuery(options)}`, { token, signal }),

  /**
   * `{ likes: [id], favourites: [id] }` for the signed-in user — one call on
   * load is enough to draw every heart on a page in its right state, and it
   * keeps the listing endpoints unauthenticated.
   */
  saved: (token, { signal } = {}) => apiRequest('/recipe/saved/ids', { token, signal }),
};
