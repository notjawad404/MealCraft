import { useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { recipeApi } from '../lib/api';
import RecipeForm from './recipe/RecipeForm';

function Saved({ recipe, onAddAnother }) {
  return (
    <div className="mx-auto max-w-xl animate-fade-up text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sage-100 text-sage-700 dark:bg-sage-900 dark:text-sage-300">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      </span>

      <h2 className="mt-7 font-display text-3xl font-semibold leading-tight tracking-tight text-ink-900 dark:text-paper-50">
        “{recipe.title}” is saved
      </h2>

      <p className="mt-4 text-[15px] leading-relaxed text-ink-600 dark:text-ink-300">
        {recipe.isPublic
          ? 'It is published and part of your cookbook.'
          : 'It is private — only you can see it.'}
      </p>

      {recipe.image && (
        <img
          src={recipe.image}
          alt=""
          className="mt-8 h-48 w-full rounded-2xl border border-ink-200 object-cover dark:border-night-600"
        />
      )}

      <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
        <button type="button" onClick={onAddAnother} className="btn-primary">
          Add another
        </button>
        <Link to="/" className="btn-ghost">
          Back home
        </Link>
      </div>
    </div>
  );
}

export default function AddRecipe() {
  const { user, token } = useAuth();
  const [saved, setSaved] = useState(null);

  // Errors are thrown back for RecipeForm to show in its banner, so the
  // filled-in form survives a failed save.
  const handleSubmit = async (payload) => {
    const recipe = await recipeApi.create({ ...payload, username: user.name }, token);
    setSaved(recipe);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden">
      <div className="grain" aria-hidden="true" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-48 h-[28rem] w-[28rem] rounded-full bg-ember-200/35 blur-3xl dark:bg-ember-800/20"
      />

      <div className="shell relative max-w-3xl py-16 lg:py-24">
        {saved ? (
          <Saved recipe={saved} onAddAnother={() => setSaved(null)} />
        ) : (
          <>
            <header className="max-w-xl">
              <p className="eyebrow flex items-center gap-3">
                <span className="h-px w-8 bg-ember-600 dark:bg-ember-300" aria-hidden="true" />
                New recipe
              </p>

              <h1 className="mt-6 font-display text-4xl font-semibold leading-tight tracking-tight text-ink-900 dark:text-paper-50 sm:text-5xl">
                Write it down
              </h1>

              <p className="mt-5 text-[15px] leading-relaxed text-ink-600 dark:text-ink-300">
                Ingredients, timing, method. Skip the preamble — the version you
                actually cook is the one worth keeping.
              </p>
            </header>

            <div className="mt-12">
              <RecipeForm onSubmit={handleSubmit} />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
