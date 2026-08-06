import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import Brand from './Brand';
import ThemeToggle from './ThemeToggle';
import useAuth from '../../hooks/useAuth';

// "Add Recipe" is covered by the "Share a recipe" button below.
const publicLinks = [
  { to: '/', label: 'Home' },
  { to: '/recipes', label: 'Recipes' },
];

const memberLinks = [{ to: '/my-recipes', label: 'My recipes' }];

const linkClasses = ({ isActive }) =>
  `relative rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200
   ${
     isActive
       ? 'text-ember-700 dark:text-ember-300'
       : 'text-ink-600 hover:text-ink-900 dark:text-ink-300 dark:hover:text-paper-50'
   }`;

function Avatar({ name }) {
  return (
    <span
      aria-hidden="true"
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ember-600 text-xs font-semibold text-paper-50 dark:bg-ember-500"
    >
      {name?.trim()?.charAt(0)?.toUpperCase() || '?'}
    </span>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const links = isAuthenticated ? [...publicLinks, ...memberLinks] : publicLinks;

  const close = () => setOpen(false);

  const handleLogout = () => {
    logout();
    close();
    navigate('/', { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-ink-200/80 bg-paper-50/85 backdrop-blur-xl dark:border-night-700 dark:bg-night-900/85">
      <nav className="shell flex h-[72px] items-center justify-between" aria-label="Main">
        <Brand />

        <div className="hidden items-center gap-1 md:flex">
          {links.map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === '/'} className={linkClasses}>
              {({ isActive }) => (
                <>
                  {label}
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-3 -bottom-px h-px origin-left bg-ember-600 transition-transform duration-300 dark:bg-ember-300 ${
                      isActive ? 'scale-x-100' : 'scale-x-0'
                    }`}
                  />
                </>
              )}
            </NavLink>
          ))}

          <span className="mx-3 h-6 w-px bg-ink-200 dark:bg-night-600" aria-hidden="true" />
          <ThemeToggle />

          {isAuthenticated ? (
            <>
              <Link to="/add" className="btn-primary ml-2 px-5 py-2.5">
                Share a recipe
              </Link>
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `ml-3 flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 transition-colors ${
                    isActive
                      ? 'border-ember-600 bg-ember-50/60 text-ember-700 dark:border-ember-400 dark:bg-night-800 dark:text-ember-300'
                      : 'border-ink-200 hover:border-ember-500 dark:border-night-600 dark:hover:border-ember-400'
                  }`
                }
                title="View & edit profile"
              >
                <Avatar name={user?.name} />
                <span className="max-w-[9rem] truncate text-sm font-medium text-ink-800 dark:text-ink-100">
                  {user?.name}
                </span>
              </NavLink>
              <button
                type="button"
                onClick={handleLogout}
                className="ml-1 grid h-10 w-10 place-items-center rounded-full text-ink-500 transition-colors hover:bg-white hover:text-ink-900 dark:text-ink-400 dark:hover:bg-night-800 dark:hover:text-paper-50"
                aria-label="Log out"
                title="Log out"
              >
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 17v1.5a2 2 0 0 1-2 2H6.5a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2H13a2 2 0 0 1 2 2V7M10 12h10m0 0-3-3m3 3-3 3" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="ml-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:text-ink-900 dark:text-ink-200 dark:hover:text-paper-50"
              >
                Log in
              </Link>
              <Link to="/add" className="btn-primary ml-1 px-5 py-2.5">
                Share a recipe
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-full border border-ink-200 text-ink-700 transition-colors hover:bg-white dark:border-night-600 dark:text-ink-200 dark:hover:bg-night-800"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <div
          id="mobile-menu"
          className="animate-fade-in border-t border-ink-200 bg-paper-50 dark:border-night-700 dark:bg-night-900 md:hidden"
        >
          <div className="shell flex flex-col gap-1 py-4">
            {isAuthenticated && (
              <NavLink
                to="/profile"
                onClick={close}
                className={({ isActive }) =>
                  `mb-2 flex items-center justify-between rounded-2xl border px-4 py-3 transition-colors ${
                    isActive
                      ? 'border-ember-600 bg-ember-50/60 text-ember-700 dark:border-ember-400 dark:bg-night-800 dark:text-ember-300'
                      : 'border-ink-200 hover:border-ember-500 dark:border-night-600 dark:hover:border-ember-400'
                  }`
                }
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={user?.name} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink-900 dark:text-paper-50">
                      {user?.name}
                    </span>
                    <span className="block truncate text-xs text-ink-500 dark:text-ink-400">
                      {user?.email}
                    </span>
                  </span>
                </div>
                <span className="text-xs font-medium text-ember-600 dark:text-ember-300">View profile</span>
              </NavLink>
            )}

            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={close}
                className={({ isActive }) =>
                  `rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-ember-50 text-ember-700 dark:bg-night-800 dark:text-ember-300'
                      : 'text-ink-700 hover:bg-white dark:text-ink-200 dark:hover:bg-night-800'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}

            {!isAuthenticated && (
              <NavLink
                to="/login"
                onClick={close}
                className="rounded-xl px-4 py-3 text-sm font-medium text-ink-700 transition-colors hover:bg-white dark:text-ink-200 dark:hover:bg-night-800"
              >
                Log in
              </NavLink>
            )}

            <Link to="/add" onClick={close} className="btn-primary mt-3">
              Share a recipe
            </Link>

            {isAuthenticated && (
              <button type="button" onClick={handleLogout} className="btn-ghost mt-2">
                Log out
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
