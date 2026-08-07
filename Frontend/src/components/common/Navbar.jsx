import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import Brand from './Brand';
import ThemeToggle from './ThemeToggle';
import useAuth from '../../hooks/useAuth';

// "Add Recipe" is covered by the "Share a recipe" button below.
const publicLinks = [
  { to: '/', label: 'Home' },
  { to: '/recipes', label: 'Recipes' },
  { to: '/cookbooks', label: 'Cookbooks' },
];

const memberLinks = [
  { to: '/my-recipes', label: 'My recipes' },
];

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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const userMenuRef = useRef(null);

  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const links = isAuthenticated ? [...publicLinks, ...memberLinks] : publicLinks;

  const close = () => {
    setOpen(false);
    setUserMenuOpen(false);
    setMobileProfileOpen(false);
  };

  const handleLogout = () => {
    logout();
    close();
    navigate('/', { replace: true });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-ink-200/80 bg-paper-50/85 backdrop-blur-xl dark:border-night-700 dark:bg-night-900/85">
      <nav className="shell flex h-[72px] items-center justify-between" aria-label="Main">
        <Brand />

        <div className="hidden items-center gap-1 lg:flex">
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

              {/* User Dropdown */}
              <div
                ref={userMenuRef}
                className="relative ml-3"
                onMouseEnter={() => setUserMenuOpen(true)}
                onMouseLeave={() => setUserMenuOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 transition-colors ${
                    userMenuOpen
                      ? 'border-ember-600 bg-ember-50/60 text-ember-700 dark:border-ember-400 dark:bg-night-800 dark:text-ember-300'
                      : 'border-ink-200 hover:border-ember-500 dark:border-night-600 dark:hover:border-ember-400'
                  }`}
                  title="User menu"
                >
                  <Avatar name={user?.name} />
                  <span className="max-w-[8rem] truncate text-sm font-medium text-ink-800 dark:text-ink-100">
                    {user?.name}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    className={`h-4 w-4 text-ink-400 transition-transform duration-200 ${
                      userMenuOpen ? 'rotate-180 text-ember-600 dark:text-ember-400' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {/* Dropdown Menu - pt-1.5 acts as invisible hover bridge */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full pt-1.5 z-50">
                    <div className="w-48 animate-fade-in rounded-2xl border border-ink-200 bg-white p-1.5 shadow-lift backdrop-blur-xl dark:border-night-700 dark:bg-night-900">
                      <NavLink
                        to="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-ember-50 text-ember-700 dark:bg-night-800 dark:text-ember-300 font-semibold'
                              : 'text-ink-700 hover:bg-paper-100 hover:text-ember-700 dark:text-ink-200 dark:hover:bg-night-800 dark:hover:text-ember-300'
                          }`
                        }
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-500" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        Profile
                      </NavLink>
                      <NavLink
                        to="/liked"
                        onClick={() => setUserMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-ember-50 text-ember-700 dark:bg-night-800 dark:text-ember-300 font-semibold'
                              : 'text-ink-700 hover:bg-paper-100 hover:text-ember-700 dark:text-ink-200 dark:hover:bg-night-800 dark:hover:text-ember-300'
                          }`
                        }
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4 text-red-500 fill-red-500/20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" />
                        </svg>
                        Liked recipes
                      </NavLink>
                    </div>
                  </div>
                )}
              </div>

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

        <div className="flex items-center gap-2 lg:hidden">
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
          className="animate-fade-in border-t border-ink-200 bg-paper-50 dark:border-night-700 dark:bg-night-900 lg:hidden"
        >
          <div className="shell flex flex-col gap-1 py-4">
            {isAuthenticated && (
              <div className="mb-2 rounded-2xl border border-ink-200 bg-paper-100/70 p-3 dark:border-night-700 dark:bg-night-800/70">
                <button
                  type="button"
                  onClick={() => setMobileProfileOpen((v) => !v)}
                  className="flex w-full items-center justify-between gap-3 px-1 py-1 text-left"
                  aria-expanded={mobileProfileOpen}
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
                  <svg
                    viewBox="0 0 24 24"
                    className={`h-4 w-4 shrink-0 text-ink-400 transition-transform duration-200 ${
                      mobileProfileOpen ? 'rotate-180 text-ember-600 dark:text-ember-400' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {mobileProfileOpen && (
                  <div className="mt-2.5 flex flex-col gap-1 border-t border-ink-200/80 pt-2.5 dark:border-night-700 animate-fade-in">
                    <NavLink
                      to="/profile"
                      onClick={close}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-ember-50 text-ember-700 dark:bg-night-900 dark:text-ember-300 font-semibold'
                            : 'text-ink-700 hover:bg-white dark:text-ink-200 dark:hover:bg-night-900'
                        }`
                      }
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-500" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M19 21v-2a4 4 0 0 4-4H9a4 4 0 0 4-4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      Profile
                    </NavLink>
                    <NavLink
                      to="/liked"
                      onClick={close}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-ember-50 text-ember-700 dark:bg-night-900 dark:text-ember-300 font-semibold'
                            : 'text-ink-700 hover:bg-white dark:text-ink-200 dark:hover:bg-night-900'
                        }`
                      }
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4 text-red-500 fill-red-500/20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" />
                      </svg>
                      Liked recipes
                    </NavLink>
                  </div>
                )}
              </div>
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

