import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cookbookApi } from '../../lib/api';
import useAuth from '../../hooks/useAuth';

export default function CookbookList() {
  const { user, token } = useAuth();
  const [cookbooks, setCookbooks] = useState([]);
  const [myCookbooks, setMyCookbooks] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'mine'
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError('');

    const fetchCookbooks = async () => {
      try {
        if (activeTab === 'mine' && token) {
          const data = await cookbookApi.mine(token);
          if (isMounted) setMyCookbooks(data);
        } else {
          const data = await cookbookApi.list({ search });
          if (isMounted) setCookbooks(data);
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load cookbooks');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const timer = setTimeout(fetchCookbooks, search ? 300 : 0);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [activeTab, search, token]);

  const displayed = activeTab === 'mine' ? myCookbooks : cookbooks;

  return (
    <div className="shell py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink-900 dark:text-ink-50">
            Cookbooks & Recipe Collections
          </h1>
          <p className="mt-1 text-base text-ink-600 dark:text-ink-300">
            Browse formatted digital PDF cookbooks compiled by home chefs and creators.
          </p>
        </div>

        {user && (
          <Link
            to="/cookbooks/create"
            className="btn btn-primary shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Cookbook
          </Link>
        )}
      </div>

      {/* Navigation Tabs & Search */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 border-b border-ink-200 dark:border-night-700">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-ember-600 text-ember-700 dark:border-ember-400 dark:text-ember-400'
                : 'border-transparent text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-200'
            }`}
          >
            All Cookbooks
          </button>
          {user && (
            <button
              onClick={() => setActiveTab('mine')}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'mine'
                  ? 'border-ember-600 text-ember-700 dark:border-ember-400 dark:text-ember-400'
                  : 'border-transparent text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-200'
              }`}
            >
              My Cookbooks ({myCookbooks.length})
            </button>
          )}
        </div>

        {activeTab === 'all' && (
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search cookbooks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="field py-2 text-sm pl-10"
            />
            <svg
              className="absolute left-3 top-2.5 h-4 w-4 text-ink-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="surface h-80 animate-pulse rounded-2xl p-4">
              <div className="h-40 w-full rounded-xl bg-ink-200 dark:bg-night-700 mb-4"></div>
              <div className="h-6 w-3/4 rounded bg-ink-200 dark:bg-night-700 mb-2"></div>
              <div className="h-4 w-1/2 rounded bg-ink-200 dark:bg-night-700"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : displayed.length === 0 ? (
        <div className="surface rounded-2xl p-12 text-center">
          <svg className="mx-auto h-16 w-16 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 className="mt-4 text-lg font-semibold text-ink-900 dark:text-ink-100">
            {activeTab === 'mine' ? "You haven't created any cookbooks yet" : 'No cookbooks found'}
          </h3>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            {activeTab === 'mine'
              ? 'Compile your favorite recipes into a beautifully formatted digital cookbook.'
              : 'Try adjusting your search terms.'}
          </p>
          {user && (
            <Link to="/cookbooks/create" className="btn btn-primary mt-6 inline-flex">
              Create Your First Cookbook
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {displayed.map((cookbook) => (
            <Link
              key={cookbook._id}
              to={`/cookbooks/${cookbook._id}`}
              className="surface group flex flex-col overflow-hidden rounded-2xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
            >
              {/* Cover Image / Thumbnail */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink-100 dark:bg-night-900">
                {cookbook.coverImage ? (
                  <img
                    src={cookbook.coverImage}
                    alt={cookbook.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-ember-500/20 to-ember-700/20 p-6 text-center">
                    <svg className="h-16 w-16 text-ember-600 dark:text-ember-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="text-xs font-semibold uppercase tracking-wider text-ember-700 dark:text-ember-300">
                      Digital Cookbook
                    </span>
                  </div>
                )}

                {/* Badge */}
                <div className="absolute right-3 top-3">
                  <span className="rounded-full bg-paper-50/90 px-3 py-1 text-xs font-bold text-ink-900 shadow backdrop-blur dark:bg-night-900/90 dark:text-paper-50">
                    {cookbook.price > 0 ? `$${cookbook.price.toFixed(2)}` : 'Free'}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="flex flex-1 flex-col p-5">
                <h2 className="text-xl font-bold text-ink-900 dark:text-ink-50 group-hover:text-ember-600 dark:group-hover:text-ember-400">
                  {cookbook.title}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm text-ink-600 dark:text-ink-300">
                  {cookbook.description || 'A digital collection of curated recipes.'}
                </p>

                <div className="mt-auto pt-4 flex items-center justify-between text-xs text-ink-500 dark:text-ink-400 border-t border-ink-100 dark:border-night-700">
                  <span>By {cookbook.author?.name || 'Author'}</span>
                  <span>{cookbook.recipes?.length || 0} Recipes</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
