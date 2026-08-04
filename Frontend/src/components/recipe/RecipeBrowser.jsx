import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { DEFAULT_SORT, PAGE_SIZE, isSort, normalizePage } from '../../lib/recipes';
import FormAlert from '../common/FormAlert';
import Pagination from '../common/Pagination';
import RecipeCard from './RecipeCard';
import RecipeToolbar from './RecipeToolbar';

const GRID = 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3';

// Clears the sticky navbar.
const STICKY_NAV_OFFSET = 88;

function Skeletons() {
  return (
    <div className={GRID} aria-hidden="true">
      {Array.from({ length: 9 }, (_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-[1.5rem] border border-ink-200 bg-white dark:border-night-600 dark:bg-night-800"
        >
          <div className="h-44 w-full bg-ink-100 dark:bg-night-700" />
          <div className="space-y-3 p-5">
            <div className="h-4 w-3/4 rounded-full bg-ink-100 dark:bg-night-700" />
            <div className="h-3 w-1/2 rounded-full bg-ink-100 dark:bg-night-700" />
            <div className="h-3 w-2/3 rounded-full bg-ink-100 dark:bg-night-700" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Empty({ title, body, action }) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-ink-300 px-8 py-20 text-center dark:border-night-600">
      <h2 className="font-display text-2xl font-semibold text-ink-900 dark:text-paper-50">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-ink-600 dark:text-ink-300">
        {body}
      </p>
      {action && <div className="mt-8 flex justify-center">{action}</div>}
    </div>
  );
}

/**
 * The list body shared by the public and personal recipe pages: search, sort,
 * filters and paging, with the URL as the source of truth. See docs/FRONTEND.md.
 *
 * `fetchPage` must be stable — wrap it in useCallback.
 * `manage` is `{ editPath(recipe), deleteRecipe(recipe), setVisibility(recipe, isPublic) }`.
 */
export default function RecipeBrowser({
  fetchPage,
  fetchSuggestions,
  emptyTitle,
  emptyBody,
  emptyAction,
  searchPlaceholder,
  showVisibility = false,
  manage = null,
}) {
  const [params, setParams] = useSearchParams();

  const search = params.get('q') ?? '';
  const sortParam = params.get('sort');
  const sort = isSort(sortParam) ? sortParam : DEFAULT_SORT;
  const page = Math.max(1, Number(params.get('page')) || 1);

  const getArrayParam = (key) => {
    const val = params.get(key);
    if (!val) return [];
    return val.split(',').map((s) => s.trim()).filter(Boolean);
  };

  const filters = {
    diet: getArrayParam('diet'),
    mealType: getArrayParam('mealType'),
    region: getArrayParam('region'),
    country: getArrayParam('country'),
    exclude: getArrayParam('exclude'),
    maxCalories: params.get('maxCalories') ?? '',
    maxTime: params.get('maxTime') ?? '',
  };

  const handleFilterChange = (updatedFilters) => {
    const changes = { page: null };
    for (const [key, val] of Object.entries(updatedFilters)) {
      if (Array.isArray(val)) {
        changes[key] = val.length > 0 ? val.join(',') : null;
      } else {
        changes[key] = val ? String(val) : null;
      }
    }
    patchParams(changes);
  };

  const handleClearFilters = () => {
    patchParams({
      diet: null,
      mealType: null,
      region: null,
      country: null,
      exclude: null,
      maxCalories: null,
      maxTime: null,
      page: null,
    });
  };

  // Local, so typing stays instant; the URL catches up once it settles.
  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 350);

  const resultsRef = useRef(null);
  const scrollOnNextResults = useRef(false);

  // `data` survives across fetches; the grid dims rather than blanking.
  const [state, setState] = useState({ data: null, error: '', pending: true });

  // Bumped after a delete to refetch the current page.
  const [reloadKey, setReloadKey] = useState(0);

  const patchParams = (changes, options) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, String(value));
        else next.delete(key);
      }
      return next;
    }, options);

  // Replaced rather than pushed, so typing does not fill up the history.
  useEffect(() => {
    if (debouncedSearch === search) return;
    patchParams({ q: debouncedSearch, page: null }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, search]);

  useEffect(() => {
    const controller = new AbortController();

    setState((previous) => ({ ...previous, pending: true }));

    fetchPage({
      search,
      sort,
      page,
      limit: PAGE_SIZE,
      mealType: filters.mealType,
      region: filters.region,
      country: filters.country,
      diet: filters.diet,
      exclude: filters.exclude,
      maxCalories: filters.maxCalories,
      maxTime: filters.maxTime,
      signal: controller.signal,
    })
      .then((data) =>
        setState({
          data: normalizePage(data, { page, limit: PAGE_SIZE }),
          error: '',
          pending: false,
        }),
      )
      .catch((err) => {
        if (controller.signal.aborted) return;
        // The last good results are kept underneath the error.
        setState((previous) => ({ ...previous, error: err.message, pending: false }));
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fetchPage,
    search,
    sort,
    page,
    params.get('diet'),
    params.get('mealType'),
    params.get('region'),
    params.get('country'),
    params.get('exclude'),
    params.get('maxCalories'),
    params.get('maxTime'),
    reloadKey,
  ]);

  /** Swap one recipe in without disturbing the page. */
  const patchRecipe = (id, changes) =>
    setState((previous) =>
      previous.data
        ? {
            ...previous,
            data: {
              ...previous.data,
              recipes: previous.data.recipes.map((recipe) =>
                recipe._id === id ? { ...recipe, ...changes } : recipe,
              ),
            },
          }
        : previous,
    );

  // Handed to each card. Errors travel back out of these promises to the card.
  const manageRecipe = (recipe) =>
    manage && {
      editPath: manage.editPath(recipe),
      onVisibilityChange: async (isPublic) => {
        const updated = await manage.setVisibility(recipe, isPublic);
        patchRecipe(recipe._id, { isPublic: updated?.isPublic ?? isPublic });
      },
      onDelete: async () => {
        await manage.deleteRecipe(recipe);
        setReloadKey((key) => key + 1);
      },
    };

  // Clamp a page number past the end back into range.
  const data = state.data;
  useEffect(() => {
    if (data && data.total > 0 && data.page > data.pages) {
      patchParams({ page: data.pages > 1 ? data.pages : null }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const goToPage = (next) => {
    // Deferred until the new page has rendered and settled its height.
    scrollOnNextResults.current = true;
    patchParams({ page: next > 1 ? next : null });
  };

  useEffect(() => {
    if (!data || !scrollOnNextResults.current) return;
    scrollOnNextResults.current = false;

    const element = resultsRef.current;
    if (!element) return;

    const top = element.getBoundingClientRect().top + window.scrollY - STICKY_NAV_OFFSET;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, [data]);

  const { error, pending } = state;
  const total = data?.total ?? 0;

  // Held back briefly, so a fast response never flashes a loading treatment.
  const [showPending, setShowPending] = useState(false);
  useEffect(() => {
    if (!pending) {
      setShowPending(false);
      return undefined;
    }
    const timer = setTimeout(() => setShowPending(true), 180);
    return () => clearTimeout(timer);
  }, [pending]);

  // Skeletons belong to the cold start only.
  const firstLoad = pending && !data;

  return (
    <div className="space-y-8">
      <RecipeToolbar
        search={searchInput}
        onSearchChange={setSearchInput}
        fetchSuggestions={fetchSuggestions}
        sort={sort}
        onSortChange={(value) => patchParams({ sort: value === DEFAULT_SORT ? null : value, page: null })}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        placeholder={searchPlaceholder}
        summary={data ? `${total} ${total === 1 ? 'recipe' : 'recipes'}` : null}
      />

      {error && <FormAlert>{error}</FormAlert>}

      {data?.stale && (
        <p
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3.5
                     text-sm leading-relaxed text-amber-900
                     dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
            <path d="M12 4 2.5 20h19L12 4Z" />
            <path d="M12 10v4M12 17.2v.3" />
          </svg>
          <span>
            The API is running an older version that ignores search, sorting and
            paging — everything is on one page below. Restart the backend to fix
            it.
          </span>
        </p>
      )}

      {/* Always 2px tall, so nothing shifts when it appears. */}
      <div className="h-0.5 overflow-hidden rounded-full" aria-hidden="true">
        {showPending && !firstLoad && (
          <div className="h-full w-1/3 animate-progress rounded-full bg-ember-500 dark:bg-ember-400" />
        )}
      </div>

      {firstLoad && showPending && <Skeletons />}

      {data && (
        <div
          ref={resultsRef}
          // Dimmed and inert rather than unmounted while a fetch is in flight.
          // The min-height keeps a short last page scrollable.
          className={`min-h-[55vh] transition-opacity duration-200 ease-out ${
            showPending ? 'pointer-events-none opacity-40' : 'opacity-100'
          }`}
        >
          {data.recipes.length === 0 ? (
            search ? (
              <Empty
                title="Nothing matches that"
                body={`No recipe here mentions “${search}”. Try a different ingredient or title.`}
                action={
                  <button type="button" onClick={() => setSearchInput('')} className="btn-ghost">
                    Clear search
                  </button>
                }
              />
            ) : (
              <Empty title={emptyTitle} body={emptyBody} action={emptyAction} />
            )
          ) : (
            <div className="space-y-8">
              <div className={GRID}>
                {data.recipes.map((recipe) => (
                  <RecipeCard
                    key={recipe._id}
                    recipe={recipe}
                    showVisibility={showVisibility}
                    manage={manageRecipe(recipe)}
                  />
                ))}
              </div>

              <Pagination page={data.page} pages={data.pages} onChange={goToPage} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
