import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cookbookApi } from '../../lib/api';
import { formatCents, formatDate } from '../../lib/money';
import useAuth from '../../hooks/useAuth';
import PageHeader from '../common/PageHeader';
import StatCard from './StatCard';

function CoverThumb({ cookbook }) {
  if (cookbook.coverImage) {
    return (
      <img
        src={cookbook.coverImage}
        alt={cookbook.title}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-ember-500/20 to-ember-700/20 p-6 text-center">
      <svg className="mb-2 h-14 w-14 text-ember-600 dark:text-ember-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
      <span className="text-xs font-semibold uppercase tracking-wider text-ember-700 dark:text-ember-300">
        Digital Cookbook
      </span>
    </div>
  );
}

export default function MyPurchases() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return undefined;

    const controller = new AbortController();

    cookbookApi
      .purchases(token, { signal: controller.signal })
      .then(setData)
      .catch((err) => {
        if (err?.name !== 'AbortError') setError(err.message || 'Could not load your purchases.');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [token]);

  const purchases = data?.purchases || [];
  const totals = data?.totals;

  return (
    <section className="relative overflow-hidden">
      <div className="grain" aria-hidden="true" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-48 h-[28rem] w-[28rem] rounded-full bg-ember-500/10 blur-3xl dark:bg-ember-500/20"
      />

      <div className="shell relative py-16 lg:py-20">
        <PageHeader
          eyebrow="Your library"
          title="Cookbooks you've bought"
          subtitle="Every cookbook you have purchased, ready to read or download whenever you like."
          action={
            <Link to="/cookbooks" className="btn-primary">
              Browse cookbooks
            </Link>
          }
        />

        {loading ? (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="surface h-80 animate-pulse rounded-2xl p-4">
                <div className="mb-4 h-40 w-full rounded-xl bg-ink-200 dark:bg-night-700" />
                <div className="mb-2 h-6 w-3/4 rounded bg-ink-200 dark:bg-night-700" />
                <div className="h-4 w-1/2 rounded bg-ink-200 dark:bg-night-700" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="mt-12 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        ) : purchases.length === 0 ? (
          <div className="surface mt-12 rounded-2xl p-12 text-center">
            <svg className="mx-auto h-16 w-16 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-ink-900 dark:text-ink-100">
              You haven&rsquo;t bought any cookbooks yet
            </h3>
            <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
              Cookbooks you buy show up here with an instant link to read or download the PDF.
            </p>
            <Link to="/cookbooks" className="btn-primary mt-6 inline-flex">
              Explore the marketplace
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              <StatCard label="Cookbooks owned" value={totals.count} />
              <StatCard
                label="Total spent"
                value={formatCents(totals.spent, totals.currency)}
                tone="accent"
              />
            </div>

            {totals.unavailable > 0 && (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                {totals.unavailable === 1
                  ? 'One cookbook you bought has been removed by its creator and is no longer available.'
                  : `${totals.unavailable} cookbooks you bought have been removed by their creators and are no longer available.`}
              </p>
            )}

            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {purchases.map(({ orderId, cookbook, purchasedAt, amount, currency }) => (
                <div
                  key={orderId}
                  className="surface group flex flex-col overflow-hidden rounded-2xl transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
                >
                  <Link
                    to={`/cookbooks/${cookbook._id}`}
                    className="relative block aspect-[4/3] w-full overflow-hidden bg-ink-100 dark:bg-night-900"
                  >
                    <CoverThumb cookbook={cookbook} />
                    <span className="absolute right-3 top-3 rounded-full bg-emerald-600/95 px-3 py-1 text-xs font-bold text-white shadow backdrop-blur">
                      Owned
                    </span>
                  </Link>

                  <div className="flex flex-1 flex-col p-5">
                    <Link to={`/cookbooks/${cookbook._id}`}>
                      <h2 className="text-xl font-bold text-ink-900 group-hover:text-ember-600 dark:text-ink-50 dark:group-hover:text-ember-400">
                        {cookbook.title}
                      </h2>
                    </Link>
                    <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
                      By {cookbook.author?.name || 'Author'} &middot; {cookbook.recipeCount} recipes
                    </p>

                    <dl className="mt-4 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-ink-500 dark:text-ink-400">Bought</dt>
                        <dd className="font-medium text-ink-800 dark:text-ink-100">
                          {formatDate(purchasedAt)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-ink-500 dark:text-ink-400">Paid</dt>
                        <dd className="font-medium text-ink-800 dark:text-ink-100">
                          {formatCents(amount, currency)}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-auto flex gap-2 pt-5">
                      <Link
                        to={`/cookbooks/${cookbook._id}`}
                        className="btn-primary flex-1 px-4 py-2.5 text-xs"
                      >
                        Read
                      </Link>
                      {cookbook.pdfUrl && (
                        <a
                          href={cookbook.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-ghost px-4 py-2.5 text-xs"
                        >
                          PDF
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
