import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { recipeApi } from '../lib/api';
import PageHeader from './common/PageHeader';
import RecipeBrowser from './recipe/RecipeBrowser';

/** Everything anyone has chosen to publish. Open to signed-out visitors. */
export default function Recipes() {
  const fetchPage = useCallback((options) => recipeApi.list(options), []);
  const fetchSuggestions = useCallback((options) => recipeApi.suggest(options), []);

  return (
    <section className="relative overflow-hidden">
      <div className="grain" aria-hidden="true" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-48 h-[28rem] w-[28rem] rounded-full bg-ember-200/35 blur-3xl dark:bg-ember-800/20"
      />

      <div className="shell relative py-16 lg:py-20">
        <PageHeader
          eyebrow="Every public recipe"
          title="Browse the cookbook"
          subtitle="What other people cook, without the thousand-word preamble. Search by title or by an ingredient you have going spare."
          action={
            <Link to="/add" className="btn-primary">
              Share a recipe
            </Link>
          }
        />

        <div className="mt-12">
          <RecipeBrowser
            fetchPage={fetchPage}
            fetchSuggestions={fetchSuggestions}
            searchPlaceholder="Search by title or ingredient"
            emptyTitle="Nothing published yet"
            emptyBody="No one has made a recipe public so far. Yours could be the first one here."
            emptyAction={
              <Link to="/add" className="btn-primary">
                Share the first recipe
              </Link>
            }
          />
        </div>
      </div>
    </section>
  );
}
