const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * fetch wrapper: success bodies are returned as-is, failures throw an ApiError
 * carrying the server's `message`.
 */
export async function apiRequest(path, { method = 'GET', body, token, signal } = {}) {
  let response;

  // Content-Type is left unset for FormData so the browser adds the boundary.
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      signal,
      headers: {
        ...(body !== undefined && !isFormData && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    });
  } catch (err) {
    // Rethrown unwrapped so callers can tell a cancellation from a failure.
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
  getProfile: (token) => apiRequest('/auth/profile', { token }),
  updateProfile: (payload, token) => apiRequest('/auth/profile', { method: 'PUT', body: payload, token }),
  changePassword: (payload, token) => apiRequest('/auth/change-password', { method: 'PUT', body: payload, token }),
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

/**
 * Plain JSON, or multipart when a newly picked photo comes with it: the photo
 * as binary and the rest as one JSON `payload` part.
 */
function recipeBody(payload, photo) {
  if (!photo) return payload;

  const form = new FormData();
  form.append('payload', JSON.stringify(payload));
  form.append('image', photo, `photo.${(photo.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')}`);
  return form;
}

export const recipeApi = {
  create: (payload, token, photo) =>
    apiRequest('/recipe', { method: 'POST', body: recipeBody(payload, photo), token }),

  /** Change a recipe you own. Only the keys sent are touched. */
  update: (id, payload, token, photo) =>
    apiRequest(`/recipe/${id}`, { method: 'PUT', body: recipeBody(payload, photo), token }),

  /** Delete a recipe you own. */
  remove: (id, token) => apiRequest(`/recipe/${id}`, { method: 'DELETE', token }),

  /** Public recipes. Returns `{ recipes, page, pages, total, limit }`. */
  list: ({ signal, ...options } = {}) => apiRequest(`/recipe${listQuery(options)}`, { signal }),

  /** One whole recipe. Send the token when there is one, or a private recipe 404s. */
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
   * Likes and favourites; no page uses these yet. Safe to repeat. Each answers
   * with the flag and the recipe's new total, e.g. `{ liked: true, likeCount: 12 }`.
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

  /** `{ likes: [id], favourites: [id] }` for the signed-in user. */
  saved: (token, { signal } = {}) => apiRequest('/recipe/saved/ids', { token, signal }),
};
