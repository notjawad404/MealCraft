import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useLikes from '../../hooks/useLikes';
import {
  allergenLabel,
  describeOrigin,
  dietLabel,
  formatTime,
  mealTypeLabel,
  splitIngredients,
} from '../../lib/recipes';
import ConfirmDialog from '../common/ConfirmDialog';

const TAG_LIMIT = 4;
const BADGE_LIMIT = 3;

// `relative z-10` lifts these above the title's stretched link.
const CARD_ACTION =
  'relative z-10 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold' +
  ' transition-colors disabled:pointer-events-none disabled:opacity-50';

/** Stand-in for recipes saved without a photo. */
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

/**
 * One recipe, as a card.
 *
 * `manage` is `{ editPath, onDelete, onVisibilityChange }` and turns on the
 * owner's controls. The two handlers may throw.
 */
export default function RecipeCard({
  recipe,
  showVisibility = false,
  manage = null,
  onLikeToggle = null,
  isRemoving = false,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLiked, toggleLike } = useLikes();

  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(''); // '' | 'visibility' | 'delete'
  const [actionError, setActionError] = useState('');

  const [likeCount, setLikeCount] = useState(recipe.likeCount ?? 0);
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    setLikeCount(recipe.likeCount ?? 0);
  }, [recipe.likeCount]);

  const liked = isLiked(recipe._id);

  const handleLikeClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (liking) return;
    setLiking(true);

    try {
      const result = await toggleLike(recipe._id);
      if (result?.unauthenticated) {
        navigate('/login', { state: { from: `${location.pathname}${location.search}` } });
        return;
      }
      const isNowLiked = typeof result?.liked === 'boolean' ? result.liked : !liked;
      if (typeof result?.likeCount === 'number') {
        setLikeCount(result.likeCount);
      } else {
        setLikeCount((prev) => (isNowLiked ? prev + 1 : Math.max(0, prev - 1)));
      }
      if (onLikeToggle) {
        onLikeToggle(recipe._id, isNowLiked, result);
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
    } finally {
      setLiking(false);
    }
  };

  const allIngredients = splitIngredients(recipe.ingredients);
  const tags = allIngredients.slice(0, TAG_LIMIT);
  const extra = allIngredients.length - tags.length;

  const origin = describeOrigin(recipe);
  // Diets and meal types share one row, diets first.
  const badges = [
    ...(recipe.diets ?? []).map((value) => ({ key: `d-${value}`, label: dietLabel(value), diet: true })),
    ...(recipe.mealTypes ?? []).map((value) => ({ key: `m-${value}`, label: mealTypeLabel(value), diet: false })),
  ];
  const shownBadges = badges.slice(0, BADGE_LIMIT);
  const allergens = recipe.allergens ?? [];

  const canToggleVisibility = Boolean(manage?.onVisibilityChange);
  const visibilityClass = `absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full px-3 py-1
                           text-[10px] font-semibold uppercase tracking-widest transition-colors ${
                             recipe.isPublic
                               ? 'bg-paper-50/95 text-ember-700'
                               : 'bg-ink-900/85 text-paper-50'
                           }`;

  const toggleVisibility = async () => {
    if (busy) return;
    setBusy('visibility');
    setActionError('');
    try {
      await manage.onVisibilityChange(!recipe.isPublic);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy('');
    }
  };

  const handleDelete = async () => {
    setBusy('delete');
    setActionError('');
    try {
      await manage.onDelete();
      setConfirming(false);
    } catch (err) {
      // The dialog stays open over a failure so the reason stays visible.
      setActionError(err.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <article
        className={`group relative flex flex-col overflow-hidden rounded-[1.5rem] border border-ink-200 bg-white
                   shadow-card transition-all duration-300 hover:shadow-lift
                   focus-within:ring-2 focus-within:ring-ember-500 focus-within:ring-offset-2 focus-within:ring-offset-paper-50
                   dark:border-night-600 dark:bg-night-800 dark:focus-within:ring-offset-night-900 ${
                     isRemoving ? 'animate-card-exit pointer-events-none' : ''
                   }`}
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

          {/* Like Button */}
          <button
            type="button"
            onClick={handleLikeClick}
            disabled={liking}
            aria-label={liked ? `Unlike recipe (${likeCount} likes)` : `Like recipe (${likeCount} likes)`}
            title={liked ? 'Unlike recipe' : 'Like recipe'}
            className="absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-full border border-white/20 bg-paper-50/90 px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur transition-transform hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-75 dark:border-night-700/60 dark:bg-night-900/85"
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-4 w-4 transition-colors ${
                liked
                  ? 'fill-red-500 text-red-500'
                  : 'fill-none stroke-current text-ink-600 dark:text-paper-50'
              }`}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" />
            </svg>
            <span className={liked ? 'font-bold text-red-600 dark:text-red-400' : 'text-ink-700 dark:text-paper-50'}>
              {likeCount}
            </span>
          </button>

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

          {showVisibility &&
            (canToggleVisibility ? (
              // The badge doubles as the switch.
              <button
                type="button"
                onClick={toggleVisibility}
                disabled={Boolean(busy)}
                aria-pressed={recipe.isPublic}
                aria-label={recipe.isPublic ? 'Public — make it private' : 'Private — make it public'}
                title={recipe.isPublic ? 'Make private' : 'Make public'}
                className={`${visibilityClass} hover:shadow-card disabled:opacity-60 ${
                  recipe.isPublic ? 'hover:bg-paper-50' : 'hover:bg-ink-900'
                }`}
              >
                {busy === 'visibility' ? (
                  <svg viewBox="0 0 24 24" className="h-3 w-3 animate-spin" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
                    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
                    <circle cx="12" cy="12" r="2.6" />
                    {!recipe.isPublic && <path d="m4 20 16-16" />}
                  </svg>
                )}
                {recipe.isPublic ? 'Public' : 'Private'}
              </button>
            ) : (
              <span className={visibilityClass}>{recipe.isPublic ? 'Public' : 'Private'}</span>
            ))}
        </div>

        <div className="flex flex-1 flex-col p-5">
          {origin && (
            <p className="mb-1.5 truncate text-[10px] font-semibold uppercase tracking-ultra text-ember-700 dark:text-ember-300">
              {origin}
            </p>
          )}

          <h3 className="font-display text-lg font-semibold leading-snug text-ink-900 dark:text-paper-50">
            {/* Stretched over the whole card. `state.from` carries the listing
                URL so the detail page can send the reader back to it. */}
            <Link
              to={`/recipes/${recipe._id}`}
              state={{ from: `${location.pathname}${location.search}` }}
              className="text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
            >
              {recipe.title}
            </Link>
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

          {manage && (
            // `mt-auto` lines this row up across cards of differing heights.
            <div className="mt-auto pt-4">
              <div className="flex items-center gap-1 border-t border-ink-100 pt-3 dark:border-night-700">
                <Link
                  to={manage.editPath}
                  className={`${CARD_ACTION} text-ink-700 hover:bg-paper-100 dark:text-ink-200 dark:hover:bg-night-700`}
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
                    <path d="m14.5 6.5 3 3" />
                  </svg>
                  Edit
                </Link>

                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  disabled={Boolean(busy)}
                  className={`${CARD_ACTION} text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40`}
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4.5 7h15M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7" />
                    <path d="M6.5 7.5 7.4 19a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-11.5" />
                  </svg>
                  Delete
                </button>
              </div>

              {actionError && !confirming && (
                <p role="alert" className="relative z-10 mt-2 text-xs leading-relaxed text-red-700 dark:text-red-300">
                  {actionError}
                </p>
              )}
            </div>
          )}
        </div>
      </article>

      {/* Mounted only while it is open. */}
      {confirming && (
        <ConfirmDialog
          open={confirming}
          title={`Delete “${recipe.title}”?`}
          body="This cannot be undone. It also disappears from the saves and favourites of anyone who kept it."
          confirmLabel="Delete recipe"
          pending={busy === 'delete'}
          error={actionError}
          onConfirm={handleDelete}
          onClose={() => {
            setConfirming(false);
            setActionError('');
          }}
        />
      )}
    </>
  );
}
