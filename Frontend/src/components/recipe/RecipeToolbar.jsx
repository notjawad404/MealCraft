import { useId } from 'react';
import { SORT_OPTIONS } from '../../lib/recipes';

/**
 * Search box and sort picker. The search value is the caller's raw input — it
 * debounces before anything is fetched, so this stays a controlled input with
 * no lag while typing.
 */
export default function RecipeToolbar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  placeholder = 'Search recipes',
  summary,
}) {
  const searchId = useId();
  const sortId = useId();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <label htmlFor={searchId} className="sr-only">
          Search recipes
        </label>

        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>

        <input
          id={searchId}
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="field pl-11 pr-10"
        />

        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg
                       text-ink-400 transition-colors hover:text-ink-800 dark:hover:text-ink-100"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <label
          htmlFor={sortId}
          className="shrink-0 text-[11px] font-semibold uppercase tracking-ultra text-ink-500 dark:text-ink-400"
        >
          Sort
        </label>
        <select
          id={sortId}
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          className="field w-auto py-2.5 pr-8"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {summary && (
        <p
          aria-live="polite"
          className="shrink-0 text-sm tabular-nums text-ink-500 dark:text-ink-400 sm:ml-1"
        >
          {summary}
        </p>
      )}
    </div>
  );
}
