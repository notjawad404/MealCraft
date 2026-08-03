import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { recipeApi } from '../lib/api';
import PageHeader from './common/PageHeader';
import RecipeBrowser from './recipe/RecipeBrowser';

/** The signed-in user's own recipes — the private ones included. */
export default function MyRecipes() {
  const { user, token } = useAuth();

  const fetchPage = useCallback((options) => recipeApi.mine(token, options), [token]);

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
          subtitle="Everything you have written down, public and private together. Only you can see this page."
          action={
            <Link to="/add" className="btn-primary">
              Add a recipe
            </Link>
          }
        />

        <div className="mt-12">
          <RecipeBrowser
            fetchPage={fetchPage}
            showVisibility
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
