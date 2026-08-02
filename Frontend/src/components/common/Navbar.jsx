import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import Brand from './Brand';
import ThemeToggle from './ThemeToggle';

const links = [
  { to: '/', label: 'Home' },
  { to: '/add', label: 'Add Recipe' },
];

const linkClasses = ({ isActive }) =>
  `relative rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200
   ${
     isActive
       ? 'text-ember-700 dark:text-ember-300'
       : 'text-ink-600 hover:text-ink-900 dark:text-ink-300 dark:hover:text-paper-50'
   }`;

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

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
          <Link to="/add" className="btn-primary ml-2 px-5 py-2.5">
            Share a recipe
          </Link>
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
            <Link to="/add" onClick={close} className="btn-primary mt-3">
              Share a recipe
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
