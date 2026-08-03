import { useId, useState } from 'react';
import {
  allergenLabel,
  dietLabel,
  mealTypeLabel,
  regionLabel,
  SORT_OPTIONS,
} from '../../lib/recipes';
import FilterAccordion from './FilterAccordion';
import SearchBox from './SearchBox';

/**
 * Search box, sort picker, and accordion filter drawer toggle.
 */
export default function RecipeToolbar({
  search,
  onSearchChange,
  fetchSuggestions,
  sort,
  onSortChange,
  filters = {},
  onFilterChange,
  onClearFilters,
  placeholder = 'Search recipes',
  summary,
}) {
  const sortId = useId();
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);

  const diets = filters.diet || [];
  const mealTypes = filters.mealType || [];
  const regions = filters.region || [];
  const countries = filters.country || [];
  const excludeList = filters.exclude || [];
  const maxCalories = filters.maxCalories || '';
  const maxTime = filters.maxTime || '';

  const activeFilterCount =
    diets.length +
    mealTypes.length +
    regions.length +
    countries.length +
    excludeList.length +
    (maxCalories ? 1 : 0) +
    (maxTime ? 1 : 0);

  const removeSingleFilter = (key, value) => {
    if (key === 'maxCalories' || key === 'maxTime') {
      onFilterChange({ [key]: '' });
      return;
    }
    const current = filters[key] || [];
    const next = current.filter((item) => item !== value);
    onFilterChange({ [key]: next });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <SearchBox
          value={search}
          onChange={onSearchChange}
          placeholder={placeholder}
          fetchSuggestions={fetchSuggestions}
        />

        <div className="flex flex-wrap items-center gap-3">
          {/* Filters Accordion Toggle Button */}
          <button
            type="button"
            onClick={() => setIsAccordionOpen((prev) => !prev)}
            className={`btn border text-xs font-semibold py-2.5 px-4 ${
              isAccordionOpen || activeFilterCount > 0
                ? 'border-ember-600 bg-ember-50 text-ember-900 dark:border-ember-500 dark:bg-ember-900/60 dark:text-ember-300'
                : 'btn-ghost'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-ember-600 px-2 py-0.5 text-[10px] font-bold text-white dark:bg-ember-500 dark:text-night-900">
                {activeFilterCount}
              </span>
            )}
            <svg
              viewBox="0 0 24 24"
              className={`h-4 w-4 transition-transform duration-200 ${
                isAccordionOpen ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {/* Sort Select */}
          <div className="flex items-center gap-2">
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
              className="field w-auto py-2.5 pr-8 text-xs"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {summary && (
          <p
            aria-live="polite"
            className="shrink-0 text-sm tabular-nums text-ink-500 dark:text-ink-400 sm:ml-auto"
          >
            {summary}
          </p>
        )}
      </div>

      {/* Accordion Filter Drawer */}
      {isAccordionOpen && (
        <div className="pt-2">
          <FilterAccordion
            filters={filters}
            onChange={onFilterChange}
            onClear={onClearFilters}
            activeCount={activeFilterCount}
          />
        </div>
      )}

      {/* Active Filter Chips bar */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="font-semibold text-ink-500 dark:text-ink-400">Active:</span>

          {diets.map((d) => (
            <span
              key={d}
              className="inline-flex items-center gap-1.5 rounded-full bg-ember-100 px-3 py-1 text-ember-900 dark:bg-ember-900/60 dark:text-ember-200 dark:border dark:border-ember-700/60"
            >
              <span>{dietLabel(d)}</span>
              <button
                type="button"
                onClick={() => removeSingleFilter('diet', d)}
                className="hover:text-ember-600 dark:hover:text-ember-400 font-bold"
                aria-label={`Remove ${dietLabel(d)} filter`}
              >
                ✕
              </button>
            </span>
          ))}

          {mealTypes.map((m) => (
            <span
              key={m}
              className="inline-flex items-center gap-1.5 rounded-full bg-sage-100 px-3 py-1 text-sage-900 dark:bg-sage-900/60 dark:text-sage-200 dark:border dark:border-sage-700/60"
            >
              <span>{mealTypeLabel(m)}</span>
              <button
                type="button"
                onClick={() => removeSingleFilter('mealType', m)}
                className="hover:text-sage-600 dark:hover:text-sage-400 font-bold"
                aria-label={`Remove ${mealTypeLabel(m)} filter`}
              >
                ✕
              </button>
            </span>
          ))}

          {regions.map((r) => (
            <span
              key={r}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 dark:border dark:border-amber-700/60"
            >
              <span>{regionLabel(r)}</span>
              <button
                type="button"
                onClick={() => removeSingleFilter('region', r)}
                className="hover:text-amber-600 dark:hover:text-amber-400 font-bold"
                aria-label={`Remove ${regionLabel(r)} filter`}
              >
                ✕
              </button>
            </span>
          ))}

          {countries.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 dark:border dark:border-amber-700/60"
            >
              <span>{c}</span>
              <button
                type="button"
                onClick={() => removeSingleFilter('country', c)}
                className="hover:text-amber-600 dark:hover:text-amber-400 font-bold"
                aria-label={`Remove ${c} filter`}
              >
                ✕
              </button>
            </span>
          ))}

          {excludeList.map((ex) => (
            <span
              key={ex}
              className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-rose-900 dark:bg-rose-900/60 dark:text-rose-200 dark:border dark:border-rose-800/60"
            >
              <span>No {allergenLabel(ex)}</span>
              <button
                type="button"
                onClick={() => removeSingleFilter('exclude', ex)}
                className="hover:text-rose-600 dark:hover:text-rose-400 font-bold"
                aria-label={`Remove no ${ex} filter`}
              >
                ✕
              </button>
            </span>
          ))}

          {maxCalories && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-sky-900 dark:bg-sky-900/60 dark:text-sky-200 dark:border dark:border-sky-800/60">
              <span>≤ {maxCalories} kcal</span>
              <button
                type="button"
                onClick={() => removeSingleFilter('maxCalories')}
                className="hover:text-sky-600 dark:hover:text-sky-400 font-bold"
                aria-label="Remove max calories filter"
              >
                ✕
              </button>
            </span>
          )}

          {maxTime && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-sky-900 dark:bg-sky-900/60 dark:text-sky-200 dark:border dark:border-sky-800/60">
              <span>≤ {maxTime} min</span>
              <button
                type="button"
                onClick={() => removeSingleFilter('maxTime')}
                className="hover:text-sky-600 dark:hover:text-sky-400 font-bold"
                aria-label="Remove max time filter"
              >
                ✕
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={onClearFilters}
            className="ml-auto text-xs font-semibold text-ember-700 hover:underline dark:text-ember-400"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
