import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { DEFAULT_SORT, PAGE_SIZE, isSort, normalizePage } from '../../lib/recipes';
import FormAlert from '../common/FormAlert';
import Pagination from '../common/Pagination';
import RecipeCard from './RecipeCard';
import RecipeToolbar from './RecipeToolbar';

const GRID = 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3';

function Skeletons() {
  return (
    <div className={GRID} aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
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

  // The box is local so typing stays instant; the URL only catches up once the
  // typing settles.
  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 350);

  const [state, setState] = useState({ status: 'loading', data: null, error: '' });

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

    setState((previous) => ({ ...previous, status: 'loading' }));

    fetchPage({ search, sort, page, limit: PAGE_SIZE, signal: controller.signal })
      .then((data) =>
        setState({
          status: 'ready',
          data: normalizePage(data, { page, limit: PAGE_SIZE }),
          error: '',
        }),
      )
      .catch((err) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', data: null, error: err.message });
      });

    return () => controller.abort();
  }, [fetchPage, search, sort, page]);

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
    patchParams({ page: next > 1 ? next : null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const total = data?.total ?? 0;

  return (
    <div className="space-y-8">
      <RecipeToolbar
        search={searchInput}
        onSearchChange={setSearchInput}
        sort={sort}
        onSortChange={(value) => patchParams({ sort: value === DEFAULT_SORT ? null : value, page: null })}
        placeholder={searchPlaceholder}
        summary={
          state.status === 'ready'
            ? `${total} ${total === 1 ? 'recipe' : 'recipes'}`
            : null
        }
      />

      {state.status === 'error' && <FormAlert>{state.error}</FormAlert>}

      {state.status === 'loading' && <Skeletons />}

      {state.status === 'ready' && data.recipes.length === 0 && (
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
      )}

      {state.status === 'ready' && data.recipes.length > 0 && (
        <>
          <div className={GRID}>
            {data.recipes.map((recipe) => (
              <RecipeCard key={recipe._id} recipe={recipe} showVisibility={showVisibility} />
            ))}
          </div>

          <Pagination page={data.page} pages={data.pages} onChange={goToPage} />
        </>
      )}
    </div>
  );
}
