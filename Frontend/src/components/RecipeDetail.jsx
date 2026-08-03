import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { recipeApi } from '../lib/api';
import {
  allergenLabel,
  describeOrigin,
  dietLabel,
  formatTime,
  mealTypeLabel,
  splitLines,
} from '../lib/recipes';
import NutritionTable from './recipe/NutritionTable';
import VideoPlayer from './recipe/VideoPlayer';

const CHIP = 'rounded-full px-3 py-1 text-xs font-semibold';

const BACK =
  'inline-flex items-center gap-2 text-sm font-semibold text-ink-600 transition-colors' +
  ' hover:text-ember-700 dark:text-ink-300 dark:hover:text-ember-300';

function Meta({ children }) {
  return <span className="inline-flex items-center gap-1.5">{children}</span>;
}

function BackArrow() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 5.5 8.5 12l6.5 6.5" />
    </svg>
  );
}

function Loading() {
  return (
    <div className="mx-auto max-w-4xl space-y-8" aria-hidden="true">
      <div className="h-3 w-28 animate-pulse rounded-full bg-ink-100 dark:bg-night-700" />
      <div className="h-11 w-3/4 animate-pulse rounded-2xl bg-ink-100 dark:bg-night-700" />
      <div className="aspect-video w-full animate-pulse rounded-2xl bg-ink-100 dark:bg-night-700" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((index) => (
            <div key={index} className="h-4 animate-pulse rounded-full bg-ink-100 dark:bg-night-700" />
          ))}
        </div>
        <div className="space-y-3">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div key={index} className="h-4 animate-pulse rounded-full bg-ink-100 dark:bg-night-700" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * One recipe, in full, on a page of its own.
 *
 * A page rather than a dialog because a recipe is a destination: it can be
 * linked to, kept open in a tab, and read on a phone without a scroll trap
 * between the cook and the method.
 */
export default function RecipeDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [state, setState] = useState({ recipe: null, error: '', pending: true });
  const [theater, setTheater] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    setState({ recipe: null, error: '', pending: true });
    // Sent whenever there is one: a private recipe is not found without it,
    // even by the person who wrote it.
    recipeApi
      .get(id, { token, signal: controller.signal })
      .then((recipe) => setState({ recipe, error: '', pending: false }))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setState({ recipe: null, error: err.message, pending: false });
      });

    return () => controller.abort();
  }, [id, token]);

  const { recipe, error, pending } = state;

  // The card that was clicked leaves its own address behind. Going back is a
  // real step back through history rather than a link to the same URL: that is
  // what returns the reader to the search, the filters, the page *and* the
  // scroll position they left — a link would push a third entry and land them
  // at the top of the list. Opened in a fresh tab there is no history to step
  // through, and no state either, so that case gets a plain link out.
  const from = location.state?.from;
  const backLabel = String(from).startsWith('/my-recipes') ? 'Back to your recipes' : 'Back to recipes';

  const ingredients = splitLines(recipe?.ingredients);
  const steps = splitLines(recipe?.instructions);
  const origin = recipe ? describeOrigin(recipe) : '';
  const image = recipe?.image || recipe?.thumbnail;

  return (
    <section className="relative overflow-hidden">
      <div className="grain" aria-hidden="true" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-48 h-[28rem] w-[28rem] rounded-full bg-sage-100/70 blur-3xl dark:bg-sage-900/30"
      />

      <div className="shell relative py-12 lg:py-16">
        {from ? (
          <button type="button" onClick={() => navigate(-1)} className={BACK}>
            <BackArrow />
            {backLabel}
          </button>
        ) : (
          <Link to="/recipes" className={BACK}>
            <BackArrow />
            All recipes
          </Link>
        )}

        <div className="mt-8">
          {pending ? (
            <Loading />
          ) : !recipe ? (
            <div className="mx-auto max-w-lg py-16 text-center">
              <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900 dark:text-paper-50">
                That recipe is not here
              </h1>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-600 dark:text-ink-300">
                {/* A private recipe answers the same way to anyone but its
                    author, so this covers deleted, mistyped and not-yours
                    alike — deliberately. */}
                {error || 'It may have been deleted, or the link may be wrong.'}
              </p>
              <Link to="/recipes" className="btn-primary mt-8">
                Browse recipes
              </Link>
            </div>
          ) : (
            <article className="mx-auto max-w-4xl">
              <header>
                <div className="flex flex-wrap items-center gap-3">
                  {origin && <p className="eyebrow">{origin}</p>}
                  {recipe.isPublic === false && (
                    <span className="rounded-full bg-ink-900/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-paper-50">
                      Private
                    </span>
                  )}
                </div>

                <h1 className="mt-3 font-display text-4xl font-semibold leading-tight tracking-tight text-ink-900 dark:text-paper-50 sm:text-5xl">
                  {recipe.title}
                </h1>

                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-500 dark:text-ink-400">
                  <Meta>
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                    {formatTime(recipe.time)}
                  </Meta>
                  {recipe.servings ? <Meta>Serves {recipe.servings}</Meta> : null}
                  {recipe.calories !== null && recipe.calories !== undefined ? (
                    <Meta>{recipe.calories} kcal per serving</Meta>
                  ) : null}
                  <Meta>by {recipe.username}</Meta>
                </div>
              </header>

              <div className="mt-10 space-y-8">
                {recipe.videoUrl ? (
                  // Theatre mode widens the video out to the shell around it
                  // and leaves the reading column where it is.
                  <div
                    className={`mx-auto transition-[max-width] duration-300 ${
                      theater ? 'max-w-6xl' : 'max-w-4xl'
                    }`}
                  >
                    <VideoPlayer
                      url={recipe.videoUrl}
                      title={recipe.title}
                      theater={theater}
                      onToggleTheater={() => setTheater((on) => !on)}
                    />
                  </div>
                ) : image ? (
                  <img
                    src={image}
                    alt=""
                    className="max-h-[30rem] w-full rounded-2xl border border-ink-200 object-cover dark:border-night-600"
                  />
                ) : null}

                {(recipe.mealTypes?.length > 0 || recipe.diets?.length > 0) && (
                  <div className="flex flex-wrap gap-2">
                    {recipe.mealTypes?.map((type) => (
                      <span key={type} className={`${CHIP} bg-paper-100 text-ink-600 dark:bg-night-700 dark:text-ink-300`}>
                        {mealTypeLabel(type)}
                      </span>
                    ))}
                    {recipe.diets?.map((diet) => (
                      <span key={diet} className={`${CHIP} bg-sage-100 text-sage-700 dark:bg-sage-900 dark:text-sage-300`}>
                        {dietLabel(diet)}
                      </span>
                    ))}
                  </div>
                )}

                {recipe.allergens?.length > 0 && (
                  <p
                    className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3.5
                               text-sm leading-relaxed text-amber-900
                               dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                  >
                    <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
                      <path d="M12 4 2.5 20h19L12 4Z" />
                      <path d="M12 10v4M12 17.2v.3" />
                    </svg>
                    <span>
                      <strong className="font-semibold">Contains</strong>{' '}
                      {recipe.allergens.map(allergenLabel).join(', ').toLowerCase()}.
                    </span>
                  </p>
                )}

                <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                  <div className="space-y-8">
                    <section>
                      <h2 className="font-display text-xl font-semibold text-ink-900 dark:text-paper-50">
                        Ingredients
                      </h2>
                      <ul className="mt-4 space-y-2">
                        {ingredients.map((line, index) => (
                          <li key={`${line}-${index}`} className="flex gap-3 text-[15px] leading-relaxed text-ink-700 dark:text-ink-200">
                            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ember-500" aria-hidden="true" />
                            {line}
                          </li>
                        ))}
                      </ul>
                    </section>

                    <NutritionTable
                      calories={recipe.calories}
                      nutrients={recipe.nutrients}
                      servings={recipe.servings}
                    />
                  </div>

                  <section>
                    <h2 className="font-display text-xl font-semibold text-ink-900 dark:text-paper-50">
                      Method
                    </h2>
                    <ol className="mt-4 space-y-4">
                      {steps.map((step, index) => (
                        <li key={`${step}-${index}`} className="flex gap-4">
                          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ember-100 text-xs font-semibold text-ember-700 dark:bg-ember-900 dark:text-ember-200">
                            {index + 1}
                          </span>
                          <p className="text-[15px] leading-relaxed text-ink-700 dark:text-ink-200">{step}</p>
                        </li>
                      ))}
                    </ol>
                  </section>
                </div>
              </div>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
