import { useState } from 'react';
import {
  allergenLabel,
  describeOrigin,
  dietLabel,
  formatTime,
  mealTypeLabel,
  splitIngredients,
} from '../../lib/recipes';
import RecipeDialog from './RecipeDialog';

const TAG_LIMIT = 4;
const BADGE_LIMIT = 3;

/** Stand-in for recipes saved without a photo — the app ships no image assets. */
function Placeholder() {
  return (
    <div className="relative grid h-44 place-items-center overflow-hidden bg-gradient-to-br from-ember-400 via-ember-500 to-ember-700">
      <div className="grain" aria-hidden="true" />
      <svg viewBox="0 0 24 24" className="relative h-11 w-11 text-paper-50/90" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 3v8a3 3 0 0 0 6 0V3M10 3v18M17.5 3c-1.3 1.7-2 3.8-2 6 0 1.7.7 2.9 2 3.5V21" />
      </svg>
    </div>
  );
}

export default function RecipeCard({ recipe, showVisibility = false }) {
  const [open, setOpen] = useState(false);

  const allIngredients = splitIngredients(recipe.ingredients);
  const tags = allIngredients.slice(0, TAG_LIMIT);
  const extra = allIngredients.length - tags.length;

  const origin = describeOrigin(recipe);
  // Meal types and diets share one row, since a card has room for one. Diets
  // go first: they are the ones someone is filtering for by eye.
  const badges = [
    ...(recipe.diets ?? []).map((value) => ({ key: `d-${value}`, label: dietLabel(value), diet: true })),
    ...(recipe.mealTypes ?? []).map((value) => ({ key: `m-${value}`, label: mealTypeLabel(value), diet: false })),
  ];
  const shownBadges = badges.slice(0, BADGE_LIMIT);
  const allergens = recipe.allergens ?? [];

  return (
    <>
      <article
        className="group relative flex flex-col overflow-hidden rounded-[1.5rem] border border-ink-200 bg-white
                   shadow-card transition-shadow duration-300 hover:shadow-lift
                   focus-within:ring-2 focus-within:ring-ember-500 focus-within:ring-offset-2 focus-within:ring-offset-paper-50
                   dark:border-night-600 dark:bg-night-800 dark:focus-within:ring-offset-night-900"
      >
        <div className="relative">
          {recipe.thumbnail ? (
            <img
              src={recipe.thumbnail}
              alt=""
              loading="lazy"
              className="h-44 w-full object-cover"
            />
          ) : (
            <Placeholder />
          )}

          {recipe.videoUrl && (
            <span
              aria-hidden="true"
              className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-night-900/75 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-paper-50 backdrop-blur"
            >
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden="true">
                <path d="M8 5.1v13.8L19 12z" />
              </svg>
              Video
            </span>
          )}

          {showVisibility && (
            <span
              className={`absolute right-3 top-3 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest ${
                recipe.isPublic
                  ? 'bg-paper-50/95 text-ember-700'
                  : 'bg-ink-900/85 text-paper-50'
              }`}
            >
              {recipe.isPublic ? 'Public' : 'Private'}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5">
          {origin && (
            <p className="mb-1.5 truncate text-[10px] font-semibold uppercase tracking-ultra text-ember-700 dark:text-ember-300">
              {origin}
            </p>
          )}

          <h3 className="font-display text-lg font-semibold leading-snug text-ink-900 dark:text-paper-50">
            {/* Stretched over the whole card, so the click target is the card
                while the accessibility tree still holds one plain control. The
                ring is drawn by the article's focus-within, since the button
                itself is only as big as its text. */}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
            >
              {recipe.title}
            </button>
          </h3>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500 dark:text-ink-400">
            <span className="inline-flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              {formatTime(recipe.time)}
            </span>

            {recipe.calories !== null && recipe.calories !== undefined && (
              <>
                <span className="h-1 w-1 shrink-0 rounded-full bg-ink-300 dark:bg-night-600" aria-hidden="true" />
                <span>{recipe.calories} kcal</span>
              </>
            )}

            <span className="h-1 w-1 shrink-0 rounded-full bg-ink-300 dark:bg-night-600" aria-hidden="true" />
            <span className="truncate">by {recipe.username}</span>
          </div>

          {shownBadges.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {shownBadges.map(({ key, label, diet }) => (
                <span
                  key={key}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    diet
                      ? 'bg-sage-100 text-sage-700 dark:bg-sage-900 dark:text-sage-300'
                      : 'bg-paper-100 text-ink-600 dark:bg-night-700 dark:text-ink-300'
                  }`}
                >
                  {label}
                </span>
              ))}
              {badges.length > shownBadges.length && (
                <span className="px-1 text-[11px] font-semibold text-ink-400 dark:text-ink-500">
                  +{badges.length - shownBadges.length}
                </span>
              )}
            </div>
          )}

          {allergens.length > 0 && (
            <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
              <svg viewBox="0 0 24 24" className="mt-px h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 4 2.5 20h19L12 4Z" />
                <path d="M12 10v4M12 17.2v.3" />
              </svg>
              <span className="line-clamp-2">
                Contains {allergens.map(allergenLabel).join(', ').toLowerCase()}
              </span>
            </p>
          )}

          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-ink-100 pt-4 dark:border-night-700">
              {tags.map((tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  className="max-w-full truncate rounded-full bg-paper-100 px-3 py-1 text-xs font-medium text-ink-600 dark:bg-night-700 dark:text-ink-300"
                >
                  {tag}
                </span>
              ))}
              {extra > 0 && (
                <span className="rounded-full px-2 py-1 text-xs font-medium text-ink-400 dark:text-ink-500">
                  +{extra} more
                </span>
              )}
            </div>
          )}
        </div>
      </article>

      {/* Mounted only while open, so twenty cards do not mean twenty dialogs —
          and so closing one stops whatever its video was playing. */}
      {open && <RecipeDialog recipe={recipe} open={open} onClose={() => setOpen(false)} />}
    </>
  );
}
