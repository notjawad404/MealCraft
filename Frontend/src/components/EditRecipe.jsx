import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { recipeApi } from '../lib/api';
import { splitLines } from '../lib/recipes';
import FormAlert from './common/FormAlert';
import RecipeForm from './recipe/RecipeForm';

/**
 * The stored record, in the shape the form's fields expect: ingredients back to
 * one line each, and the optional numbers back to empty boxes rather than the
 * nulls the API answers with — React reads a null value as "uncontrolled" and
 * complains the moment the box is typed in.
 */
function toFormValues(recipe) {
  const ingredients = splitLines(recipe.ingredients);

  return {
    title: recipe.title ?? '',
    ingredients: ingredients.length > 0 ? ingredients : [''],
    instructions: recipe.instructions ?? '',
    time: String(recipe.time ?? ''),
    servings: recipe.servings ?? '',
    mealTypes: recipe.mealTypes ?? [],
    regions: recipe.regions ?? [],
    countries: recipe.countries ?? [],
    allergens: recipe.allergens ?? [],
    diets: recipe.diets ?? [],
    calories: recipe.calories ?? '',
    nutrients: recipe.nutrients ?? [],
    videoUrl: recipe.videoUrl ?? '',
    image: recipe.image ?? '',
    photo: null,
    isPublic: recipe.isPublic !== false,
  };
}

function Loading() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="h-4 w-32 animate-pulse rounded-full bg-ink-100 dark:bg-night-700" />
      <div className="h-10 w-2/3 animate-pulse rounded-2xl bg-ink-100 dark:bg-night-700" />
      <div className="h-64 animate-pulse rounded-2xl bg-ink-100 dark:bg-night-700" />
    </div>
  );
}

/** A recipe you already wrote, opened back up. */
export default function EditRecipe() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [state, setState] = useState({ recipe: null, error: '', pending: true });

  useEffect(() => {
    const controller = new AbortController();

    setState({ recipe: null, error: '', pending: true });
    // The token matters here: a private recipe is not found without it.
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

  // `createdBy` comes back populated with the author's name, so the id is a
  // step down. The API refuses this too — this only saves the round trip and
  // says something clearer than "403".
  const ownerId = recipe?.createdBy?._id ?? recipe?.createdBy;
  const isOwner = Boolean(ownerId) && String(ownerId) === String(user?.id);

  // Thrown errors are left for RecipeForm's banner, so a rejected save keeps
  // everything that was typed.
  const handleSubmit = async (payload, photo) => {
    await recipeApi.update(id, payload, token, photo);
    navigate('/my-recipes');
  };

  return (
    <section className="relative overflow-hidden">
      <div className="grain" aria-hidden="true" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-48 h-[28rem] w-[28rem] rounded-full bg-ember-200/35 blur-3xl dark:bg-ember-800/20"
      />

      <div className="shell relative max-w-3xl py-16 lg:py-24">
        {pending ? (
          <Loading />
        ) : error || !recipe || !isOwner ? (
          <div className="max-w-xl">
            <FormAlert>
              {error || (recipe ? 'This recipe belongs to someone else.' : 'Recipe not found.')}
            </FormAlert>
            <Link to="/my-recipes" className="btn-ghost mt-8">
              Back to your recipes
            </Link>
          </div>
        ) : (
          <>
            <header className="max-w-xl">
              <p className="eyebrow flex items-center gap-3">
                <span className="h-px w-8 bg-ember-600 dark:bg-ember-300" aria-hidden="true" />
                Editing
              </p>

              <h1 className="mt-6 font-display text-4xl font-semibold leading-tight tracking-tight text-ink-900 dark:text-paper-50 sm:text-5xl">
                {recipe.title}
              </h1>

              <p className="mt-5 text-[15px] leading-relaxed text-ink-600 dark:text-ink-300">
                Change whatever has drifted since you wrote it down — the timing,
                a quantity, the step that never quite worked.
              </p>
            </header>

            <div className="mt-12">
              <RecipeForm
                initialValues={toFormValues(recipe)}
                onSubmit={handleSubmit}
                submitLabel="Save changes"
              />

              <Link to="/my-recipes" className="btn-ghost mt-4 w-full">
                Cancel
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
