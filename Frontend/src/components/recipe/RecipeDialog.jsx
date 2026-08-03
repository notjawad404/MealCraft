import { useEffect, useRef, useState } from 'react';
import { recipeApi } from '../../lib/api';
import {
  allergenLabel,
  describeOrigin,
  dietLabel,
  formatTime,
  mealTypeLabel,
  splitLines,
} from '../../lib/recipes';
import FormAlert from '../common/FormAlert';
import NutritionTable from './NutritionTable';
import VideoPlayer from './VideoPlayer';
import { Icon } from './videoControls';

const CHIP = 'rounded-full px-3 py-1 text-xs font-semibold';

function Meta({ children }) {
  return <span className="inline-flex items-center gap-1.5">{children}</span>;
}

/**
 * A recipe in full, over the page it was opened from.
 *
 * The listing endpoints leave out the method and the full-size image, so this
 * asks for the whole record on open and shows the card's own copy in the
 * meantime — the title and the photo are already to hand, and blanking them for
 * the length of a request would be a flicker for nothing.
 *
 * Built on <dialog>, which brings the focus trap, the escape key and the
 * inert background with it.
 */
export default function RecipeDialog({ recipe, open, onClose }) {
  const dialogRef = useRef(null);
  const [full, setFull] = useState(null);
  const [error, setError] = useState('');
  const [theater, setTheater] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const controller = new AbortController();
    setError('');
    recipeApi
      .get(recipe._id, { signal: controller.signal })
      .then(setFull)
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      });

    return () => controller.abort();
  }, [open, recipe._id]);

  // Everything the card already had is read from `recipe`; the rest waits.
  const data = full ?? recipe;
  const ingredients = splitLines(data.ingredients);
  const steps = splitLines(full?.instructions);
  const origin = describeOrigin(data);
  const image = full?.image || data.thumbnail;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        // The dialog element itself is only ever the backdrop — the panel
        // inside it covers the rest.
        if (e.target === dialogRef.current) onClose();
      }}
      className={`app-dialog m-auto w-full overflow-visible bg-transparent p-0 transition-[max-width] duration-300
                  ${theater ? 'max-w-[96vw]' : 'max-w-3xl'}`}
    >
      <div className="max-h-[90vh] overflow-y-auto overscroll-contain rounded-[1.75rem] bg-paper-50 shadow-lift dark:bg-night-800">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 bg-paper-50/95 px-6 pt-6 backdrop-blur dark:bg-night-800/95">
          <div className="min-w-0">
            {origin && (
              <p className="eyebrow truncate">{origin}</p>
            )}
            <h2 className="mt-1 truncate font-display text-2xl font-semibold tracking-tight text-ink-900 dark:text-paper-50">
              {data.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-500 transition-colors
                       hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-night-700 dark:hover:text-paper-50"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-8 px-6 pb-8 pt-5">
          {data.videoUrl ? (
            <VideoPlayer
              url={data.videoUrl}
              title={data.title}
              theater={theater}
              onToggleTheater={() => setTheater((on) => !on)}
            />
          ) : image ? (
            <img
              src={image}
              alt=""
              className="max-h-[26rem] w-full rounded-2xl border border-ink-200 object-cover dark:border-night-600"
            />
          ) : null}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-500 dark:text-ink-400">
            <Meta>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              {formatTime(data.time)}
            </Meta>
            {data.servings ? <Meta>Serves {data.servings}</Meta> : null}
            {data.calories !== null && data.calories !== undefined ? (
              <Meta>{data.calories} kcal per serving</Meta>
            ) : null}
            <Meta>by {data.username}</Meta>
          </div>

          {(data.mealTypes?.length > 0 || data.diets?.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {data.mealTypes?.map((type) => (
                <span key={type} className={`${CHIP} bg-paper-100 text-ink-600 dark:bg-night-700 dark:text-ink-300`}>
                  {mealTypeLabel(type)}
                </span>
              ))}
              {data.diets?.map((diet) => (
                <span key={diet} className={`${CHIP} bg-sage-100 text-sage-700 dark:bg-sage-900 dark:text-sage-300`}>
                  {dietLabel(diet)}
                </span>
              ))}
            </div>
          )}

          {data.allergens?.length > 0 && (
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
                {data.allergens.map(allergenLabel).join(', ').toLowerCase()}.
              </span>
            </p>
          )}

          {error && <FormAlert>{error}</FormAlert>}

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div className="space-y-8">
              <section>
                <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-paper-50">
                  Ingredients
                </h3>
                <ul className="mt-3 space-y-2">
                  {ingredients.map((line, index) => (
                    <li key={`${line}-${index}`} className="flex gap-3 text-[15px] leading-relaxed text-ink-700 dark:text-ink-200">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ember-500" aria-hidden="true" />
                      {line}
                    </li>
                  ))}
                </ul>
              </section>

              <NutritionTable
                calories={data.calories}
                nutrients={data.nutrients}
                servings={data.servings}
              />
            </div>

            <section>
              <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-paper-50">
                Method
              </h3>

              {full ? (
                <ol className="mt-3 space-y-4">
                  {steps.map((step, index) => (
                    <li key={`${step}-${index}`} className="flex gap-4">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ember-100 text-xs font-semibold text-ember-700 dark:bg-ember-900 dark:text-ember-200">
                        {index + 1}
                      </span>
                      <p className="text-[15px] leading-relaxed text-ink-700 dark:text-ink-200">{step}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="mt-3 space-y-3" aria-hidden="true">
                  {[0, 1, 2, 3].map((index) => (
                    <div key={index} className="h-4 animate-pulse rounded-full bg-ink-100 dark:bg-night-700" />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </dialog>
  );
}
