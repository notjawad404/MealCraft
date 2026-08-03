import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { DEFAULT_SORT, PAGE_SIZE, isSort, normalizePage } from '../../lib/recipes';
import FormAlert from '../common/FormAlert';
import Pagination from '../common/Pagination';
import RecipeCard from './RecipeCard';
import RecipeToolbar from './RecipeToolbar';

const GRID = 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3';

// Clears the sticky navbar (72px) so the first row is not tucked underneath it.
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
 * The list body shared by the public and personal recipe pages: search, sort
 * and paging, with the URL as the single source of truth so a filtered view can
 * be linked to and the back button behaves.
 *
 * `fetchPage` must be stable — wrap it in useCallback — and takes
 * `{ search, sort, page, limit, signal }`.
 */
export default function RecipeBrowser({
  fetchPage,
  fetchSuggestions,
  emptyTitle,
  emptyBody,
  emptyAction,
  searchPlaceholder,
  showVisibility = false,
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

  // The box is local so typing stays instant; the URL only catches up once the
  // typing settles.
  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 350);

  const resultsRef = useRef(null);
  const scrollOnNextResults = useRef(false);

  // `data` deliberately survives across fetches. Blanking it and dropping back
  // to skeletons on every keystroke, sort or page turn is what made the grid
  // flicker; instead the previous results stay put and dim until the new ones
  // land. Skeletons are then only ever seen once, on the very first load.
  const [state, setState] = useState({ data: null, error: '', pending: true });

  const patchParams = (changes, options) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, String(value));
        else next.delete(key);
      }
      return next;
    }, options);

  // Settled search text goes into the URL, which is what actually triggers a
  // fetch. Replaced rather than pushed, so a search does not bury the previous
  // page under one history entry per pause in typing.
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
        // The last good results are kept underneath the error, so a dropped
        // request does not wipe the page out.
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
  ]);

  // Reachable by editing the URL, or by landing on a deep page whose recipes
  // have since been deleted.
  const data = state.data;
  useEffect(() => {
    if (data && data.total > 0 && data.page > data.pages) {
      patchParams({ page: data.pages > 1 ? data.pages : null }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const goToPage = (next) => {
    // The scroll itself is deferred until the new page has rendered. Scrolling
    // straight away works against a document that is still 20 cards tall; when
    // it shrinks to 2 the browser clamps the scroll back up, which is the exact
    // jump this is meant to remove.
    scrollOnNextResults.current = true;
    patchParams({ page: next > 1 ? next : null });
  };

  useEffect(() => {
    if (!data || !scrollOnNextResults.current) return;
    scrollOnNextResults.current = false;

    const element = resultsRef.current;
    if (!element) return;

    // Everything above the grid is fixed height, so this lands in the same
    // place whether the page holds twenty cards or two.
    const top = element.getBoundingClientRect().top + window.scrollY - STICKY_NAV_OFFSET;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, [data]);

  const { error, pending } = state;
  const total = data?.total ?? 0;

  // A local API answers in tens of milliseconds. Dimming the grid for that long
  // is just a blink — a second kind of flicker, in place of the one being
  // fixed. So the loading treatment waits to see whether the request is
  // actually slow enough to be worth mentioning; most of the time it never
  // appears at all and the swap looks instant.
  const [showPending, setShowPending] = useState(false);
  useEffect(() => {
    if (!pending) {
      setShowPending(false);
      return undefined;
    }
    const timer = setTimeout(() => setShowPending(true), 180);
    return () => clearTimeout(timer);
  }, [pending]);

  // Skeletons belong to the cold start only — every later fetch has something
  // real to show while it waits.
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

      {/* Always 2px tall, present or not, so nothing shifts when it appears. */}
      <div className="h-0.5 overflow-hidden rounded-full" aria-hidden="true">
        {showPending && !firstLoad && (
          <div className="h-full w-1/3 animate-progress rounded-full bg-ember-500 dark:bg-ember-400" />
        )}
      </div>

      {firstLoad && showPending && <Skeletons />}

      {data && (
        <div
          ref={resultsRef}
          // Dimmed rather than unmounted while the next page is in flight, and
          // inert so a second click cannot land on results about to be replaced.
          //
          // The min-height is a floor, not padding: a last page holding two
          // cards would otherwise leave the document too short to scroll their
          // row up to the top, and the footer would ride up under them.
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
                  <RecipeCard key={recipe._id} recipe={recipe} showVisibility={showVisibility} />
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
