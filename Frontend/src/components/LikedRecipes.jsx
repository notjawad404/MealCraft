import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { recipeApi } from '../lib/api';
import PageHeader from './common/PageHeader';
import RecipeBrowser from './recipe/RecipeBrowser';

/** Page displaying all recipes liked by the signed-in user. */
export default function LikedRecipes() {
  const { token } = useAuth();

  const fetchPage = useCallback((options) => recipeApi.liked(token, options), [token]);
  const fetchSuggestions = useCallback((options) => recipeApi.suggest(options), [token]);

  return (
    <section className="relative overflow-hidden">
      <div className="grain" aria-hidden="true" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-48 h-[28rem] w-[28rem] rounded-full bg-ember-500/10 blur-3xl dark:bg-ember-500/20"
      />

      <div className="shell relative py-16 lg:py-20">
        <PageHeader
          eyebrow="Your collection"
          title="Liked recipes"
          subtitle="All the recipes you have liked and saved. Tap the heart on any recipe to add or remove it from your favorites."
          action={
            <Link to="/recipes" className="btn-primary">
              Explore recipes
            </Link>
          }
        />

        <div className="mt-12">
          <RecipeBrowser
            fetchPage={fetchPage}
            fetchSuggestions={fetchSuggestions}
            removeOnUnlike
            searchPlaceholder="Search your liked recipes"
            emptyTitle="No liked recipes yet"
            emptyBody="Browse recipes from around the world and click the heart icon to save your favorites here."
            emptyAction={
              <Link to="/recipes" className="btn-primary">
                Browse recipes
              </Link>
            }
          />
        </div>
      </div>
    </section>
  );
}
