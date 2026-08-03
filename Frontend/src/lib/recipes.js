/** Shared vocabulary for the two listing pages and the backend they talk to. */

export const PAGE_SIZE = 20;

export const DEFAULT_SORT = 'newest';

// `value` has to match the keys of SORTS in Backend/controller/recipeController.js.
export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'quickest', label: 'Quickest first' },
  { value: 'longest', label: 'Longest first' },
];

export const isSort = (value) => SORT_OPTIONS.some((option) => option.value === value);

/** `ingredients` is stored as one newline-joined string. */
export const splitIngredients = (value) =>
  (value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const num = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

/**
 * Coerces a listing response into the paged shape the UI renders. A version of
 * the backend from before paging existed answers with a bare array, and a stale
 * dev server is the likeliest thing to hand one over — callers should degrade to
 * "everything on one page" rather than crash on a missing `recipes`.
 */
export function normalizePage(data, { page = 1, limit = PAGE_SIZE } = {}) {
  if (Array.isArray(data)) {
    return { recipes: data, page: 1, pages: 1, total: data.length, limit };
  }
  if (!data || !Array.isArray(data.recipes)) {
    return { recipes: [], page: 1, pages: 1, total: 0, limit };
  }
  return {
    recipes: data.recipes,
    page: num(data.page, page),
    pages: Math.max(1, num(data.pages, 1)),
    total: num(data.total, data.recipes.length),
    limit: num(data.limit, limit),
  };
}

/** "90" → "1 hr 30 min". Falls back to the raw value if it is not a number. */
export function formatTime(minutes) {
  const total = Number(minutes);
  if (!Number.isFinite(total) || total <= 0) return String(minutes ?? '');
  if (total < 60) return `${total} min`;

  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}
