import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cookbookApi } from '../../lib/api';
import { formatCents, formatPrice, formatDate } from '../../lib/money';
import useAuth from '../../hooks/useAuth';
import PageHeader from '../common/PageHeader';
import StatCard from './StatCard';

function CoverThumb({ title, coverImage }) {
  if (coverImage) {
    return (
      <img
        src={coverImage}
        alt=""
        className="h-11 w-11 shrink-0 rounded-lg object-cover"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-ember-100 text-sm font-bold text-ember-700 dark:bg-ember-950/60 dark:text-ember-300"
    >
      {title?.trim()?.charAt(0)?.toUpperCase() || '?'}
    </span>
  );
}

function SkeletonBlock() {
  return (
    <div className="mt-12 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="surface h-28 animate-pulse rounded-2xl" />
        ))}
      </div>
      <div className="surface h-64 animate-pulse rounded-2xl" />
    </div>
  );
}

export default function SalesDashboard() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return undefined;

    const controller = new AbortController();

    cookbookApi
      .sales(token, { signal: controller.signal })
      .then(setData)
      .catch((err) => {
        if (err?.name !== 'AbortError') setError(err.message || 'Could not load your sales.');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [token]);

  const totals = data?.totals;
  const cookbooks = data?.cookbooks || [];
  const recentSales = data?.recentSales || [];

  const hasSales = Boolean(totals?.copiesSold);

  return (
    <section className="relative overflow-hidden">
      <div className="grain" aria-hidden="true" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-48 h-[28rem] w-[28rem] rounded-full bg-ember-500/10 blur-3xl dark:bg-ember-500/20"
      />

      <div className="shell relative py-16 lg:py-20">
        <PageHeader
          eyebrow="Creator earnings"
          title="Your cookbook sales"
          subtitle="How many copies each of your cookbooks has sold, what it earned, and who bought it."
          action={
            <Link to="/profile" className="btn-ghost">
              Payout settings
            </Link>
          }
        />

        {loading ? (
          <SkeletonBlock />
        ) : error ? (
          <div className="mt-12 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        ) : cookbooks.length === 0 ? (
          <div className="surface mt-12 rounded-2xl p-12 text-center">
            <svg className="mx-auto h-16 w-16 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-ink-900 dark:text-ink-100">
              Nothing to sell yet
            </h3>
            <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
              Publish a cookbook and its sales, buyers and earnings all show up here.
            </p>
            <Link to="/cookbooks/create" className="btn-primary mt-6 inline-flex">
              Create a cookbook
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Copies sold"
                value={totals.copiesSold}
                hint={
                  totals.cookbooksSelling === 1
                    ? 'across 1 cookbook'
                    : `across ${totals.cookbooksSelling} cookbooks`
                }
              />
              <StatCard label="Gross revenue" value={formatCents(totals.gross, totals.currency)} />
              <StatCard
                label="Your earnings"
                value={formatCents(totals.net, totals.currency)}
                hint="after platform and Stripe fees"
                tone="accent"
              />
              <StatCard
                label="Cookbooks published"
                value={cookbooks.filter((cookbook) => cookbook.isPublished).length}
                hint={`${cookbooks.length} in total`}
              />
            </div>

            {hasSales && totals.awaitingPayout > 0 && (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                {totals.awaitingPayout === 1
                  ? '1 sale is still being settled by Stripe. Its payout lands once the charge clears.'
                  : `${totals.awaitingPayout} sales are still being settled by Stripe. Their payouts land once the charges clear.`}
              </p>
            )}

            <div className="surface mt-10 overflow-hidden rounded-2xl">
              <div className="border-b border-ink-200 px-6 py-4 dark:border-night-600">
                <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-paper-50">
                  Sales by cookbook
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] text-sm">
                  <thead>
                    <tr className="border-b border-ink-200 text-left text-xs font-semibold uppercase tracking-widest text-ink-500 dark:border-night-600 dark:text-ink-400">
                      <th className="px-6 py-3 font-semibold">Cookbook</th>
                      <th className="px-6 py-3 font-semibold">Price</th>
                      <th className="px-6 py-3 text-right font-semibold">Sold</th>
                      <th className="px-6 py-3 text-right font-semibold">Revenue</th>
                      <th className="px-6 py-3 text-right font-semibold">Earned</th>
                      <th className="px-6 py-3 text-right font-semibold">Last sale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100 dark:divide-night-700">
                    {cookbooks.map((cookbook) => (
                      <tr key={cookbook._id} className="hover:bg-paper-100/60 dark:hover:bg-night-900/60">
                        <td className="px-6 py-4">
                          <Link
                            to={`/cookbooks/${cookbook._id}`}
                            className="flex items-center gap-3 hover:text-ember-600 dark:hover:text-ember-400"
                          >
                            <CoverThumb title={cookbook.title} coverImage={cookbook.coverImage} />
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-ink-900 dark:text-paper-50">
                                {cookbook.title}
                              </span>
                              {!cookbook.isPublished && (
                                <span className="mt-0.5 inline-block rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-600 dark:bg-night-800 dark:text-ink-300">
                                  Draft
                                </span>
                              )}
                            </span>
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-ink-600 dark:text-ink-300">
                          {cookbook.price > 0 ? formatPrice(cookbook.price, cookbook.currency) : 'Free'}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-ink-900 dark:text-paper-50">
                          {cookbook.copiesSold}
                        </td>
                        <td className="px-6 py-4 text-right text-ink-600 dark:text-ink-300">
                          {formatCents(cookbook.gross, cookbook.currency)}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                          {formatCents(cookbook.net, cookbook.currency)}
                        </td>
                        <td className="px-6 py-4 text-right text-ink-500 dark:text-ink-400">
                          {cookbook.lastSoldAt ? formatDate(cookbook.lastSoldAt) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="surface mt-8 overflow-hidden rounded-2xl">
              <div className="border-b border-ink-200 px-6 py-4 dark:border-night-600">
                <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-paper-50">
                  Recent sales
                </h2>
              </div>

              {recentSales.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-ink-500 dark:text-ink-400">
                  No one has bought a cookbook yet. Share your cookbook link to get your first sale.
                </p>
              ) : (
                <ul className="divide-y divide-ink-100 dark:divide-night-700">
                  {recentSales.map((sale) => (
                    <li key={sale.orderId} className="flex items-center gap-4 px-6 py-4">
                      <CoverThumb
                        title={sale.cookbook?.title}
                        coverImage={sale.cookbook?.coverImage}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink-900 dark:text-paper-50">
                          {sale.cookbook?.title || 'Deleted cookbook'}
                        </p>
                        <p className="truncate text-xs text-ink-500 dark:text-ink-400">
                          {sale.buyer?.name || 'A buyer'} &middot; {formatDate(sale.soldAt)}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="font-semibold text-ink-900 dark:text-paper-50">
                          {formatCents(sale.amount, sale.currency)}
                        </p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400">
                          {formatCents(sale.net, sale.currency)} to you
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
