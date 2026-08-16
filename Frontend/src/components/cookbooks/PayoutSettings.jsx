import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { connectApi } from '../../lib/api';
import useAuth from '../../hooks/useAuth';

export default function PayoutSettings() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(
    async (signal) => {
      try {
        const data = await connectApi.status(token, { signal });
        setStatus(data);
        setError('');
      } catch (err) {
        if (err?.name !== 'AbortError') setError(err.message || 'Could not read payout status.');
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    const outcome = searchParams.get('stripe');
    if (!outcome) return;

    const next = new URLSearchParams(searchParams);
    next.delete('stripe');
    setSearchParams(next, { replace: true });

    if (outcome === 'refresh') {
      setError('That setup link expired. Start again to pick up where you left off.');
    }
  }, [searchParams, setSearchParams]);

  const openOnboarding = async () => {
    setError('');
    try {
      setWorking(true);
      const { url } = await connectApi.onboard(token);
      window.location.href = url;
    } catch (err) {
      setError(err.message || 'Could not start Stripe setup.');
      setWorking(false);
    }
  };

  const openDashboard = async () => {
    setError('');
    try {
      setWorking(true);
      const { url } = await connectApi.dashboard(token);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err.message || 'Could not open your Stripe dashboard.');
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <div className="surface rounded-2xl p-6">
        <div className="h-6 w-48 animate-pulse rounded bg-ink-200 dark:bg-night-700" />
        <div className="mt-4 h-4 w-full animate-pulse rounded bg-ink-200 dark:bg-night-700" />
      </div>
    );
  }

  const payoutsEnabled = Boolean(status?.payoutsEnabled);
  const started = Boolean(status?.hasAccount);
  const requirements = status?.requirementsDue || [];

  return (
    <div className="surface rounded-2xl p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-ink-900 dark:text-ink-50">
            Payouts
          </h2>
          <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">
            Connect a Stripe account to sell your cookbooks and get paid.
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
            payoutsEnabled
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
              : started
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                : 'bg-ink-100 text-ink-600 dark:bg-night-800 dark:text-ink-300'
          }`}
        >
          {payoutsEnabled ? 'Enabled' : started ? 'Incomplete' : 'Not connected'}
        </span>
      </div>

      {status && !status.configured && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          Payments are not configured on this server, so cookbooks cannot be sold yet.
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {status?.configured && (
        <div className="mt-6">
          {payoutsEnabled ? (
            <>
              <p className="text-sm text-ink-700 dark:text-ink-200">
                You&rsquo;re all set. Buyers can purchase your paid cookbooks, and
                Stripe pays you on its normal schedule.
              </p>
              <button
                type="button"
                onClick={openDashboard}
                disabled={working}
                className="btn btn-ghost mt-4 disabled:opacity-60"
              >
                View payouts on Stripe
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-700 dark:text-ink-200">
                {started
                  ? 'Stripe still needs a few details before it can pay you.'
                  : 'Stripe handles the signup and verification. It takes a couple of minutes.'}
              </p>

              {requirements.length > 0 && (
                <ul className="mt-3 list-inside list-disc text-xs text-ink-500 dark:text-ink-400">
                  {requirements.slice(0, 5).map((item) => (
                    <li key={item}>{item.replace(/_/g, ' ').replace(/\./g, ' → ')}</li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                onClick={openOnboarding}
                disabled={working}
                className="btn btn-primary mt-4 disabled:opacity-60"
              >
                {working
                  ? 'Opening Stripe…'
                  : started
                    ? 'Finish Stripe setup'
                    : 'Connect Stripe account'}
              </button>
            </>
          )}
        </div>
      )}

      <p className="mt-6 border-t border-ink-100 pt-4 text-xs text-ink-500 dark:border-night-700 dark:text-ink-400">
        On each sale MealCraft keeps 10%, Stripe deducts its processing fee, and
        the rest goes to you.
      </p>
    </div>
  );
}
