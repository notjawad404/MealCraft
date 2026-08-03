import { useId } from 'react';
import { SORT_OPTIONS } from '../../lib/recipes';
import SearchBox from './SearchBox';

/**
 * Search box and sort picker. The search value is the caller's raw input — it
 * debounces before anything is fetched, so this stays a controlled input with
 * no lag while typing.
 */
export default function RecipeToolbar({
  search,
  onSearchChange,
  fetchSuggestions,
  sort,
  onSortChange,
  placeholder = 'Search recipes',
  summary,
}) {
  const sortId = useId();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <SearchBox
        value={search}
        onChange={onSearchChange}
        placeholder={placeholder}
        fetchSuggestions={fetchSuggestions}
      />

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
