import { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { recipeApi } from '../lib/api';
import PageHeader from './common/PageHeader';
import RecipeBrowser from './recipe/RecipeBrowser';

/** The signed-in user's own recipes — the private ones included. */
export default function MyRecipes() {
  const { user, token } = useAuth();

  const fetchPage = useCallback((options) => recipeApi.mine(token, options), [token]);
  const fetchSuggestions = useCallback((options) => recipeApi.suggestMine(token, options), [token]);

  // What the owner's controls on each card actually do. The browser decides
  // what each one means for the list it is showing.
  const manage = useMemo(
    () => ({
      editPath: (recipe) => `/recipes/${recipe._id}/edit`,
      deleteRecipe: (recipe) => recipeApi.remove(recipe._id, token),
      setVisibility: (recipe, isPublic) => recipeApi.update(recipe._id, { isPublic }, token),
    }),
    [token],
  );

  return (
    <section className="relative overflow-hidden">
      <div className="grain" aria-hidden="true" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-48 h-[28rem] w-[28rem] rounded-full bg-sage-100/70 blur-3xl dark:bg-sage-900/30"
      />

      <div className="shell relative py-16 lg:py-20">
        <PageHeader
          eyebrow={user?.name ? `${user.name}’s cookbook` : 'Your cookbook'}
          title="Your recipes"
          subtitle="Everything you have written down, public and private together. Only you can see this page — press a recipe’s badge to switch it between the two."
          action={
            <Link to="/add" className="btn-primary">
              Add a recipe
            </Link>
          }
        />

        <div className="mt-12">
          <RecipeBrowser
            fetchPage={fetchPage}
            fetchSuggestions={fetchSuggestions}
            showVisibility
            manage={manage}
            searchPlaceholder="Search your recipes"
            emptyTitle="Your cookbook is empty"
            emptyBody="Start with the one you already know by heart — it is the one you will reach for most."
            emptyAction={
              <Link to="/add" className="btn-primary">
                Add your first recipe
              </Link>
            }
          />
        </div>
      </div>
    </section>
  );
}
