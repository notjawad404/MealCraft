import { formatTime, splitIngredients } from '../../lib/recipes';

const TAG_LIMIT = 4;

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
  const tags = splitIngredients(recipe.ingredients).slice(0, TAG_LIMIT);
  const extra = splitIngredients(recipe.ingredients).length - tags.length;

  return (
    <article className="group flex flex-col overflow-hidden rounded-[1.5rem] border border-ink-200 bg-white shadow-card transition-shadow duration-300 hover:shadow-lift dark:border-night-600 dark:bg-night-800">
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
        <h3 className="font-display text-lg font-semibold leading-snug text-ink-900 dark:text-paper-50">
          {recipe.title}
        </h3>

        <div className="mt-3 flex items-center gap-3 text-sm text-ink-500 dark:text-ink-400">
          <span className="inline-flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            {formatTime(recipe.time)}
          </span>
          <span className="h-1 w-1 shrink-0 rounded-full bg-ink-300 dark:bg-night-600" aria-hidden="true" />
          <span className="truncate">by {recipe.username}</span>
        </div>

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
  );
}
