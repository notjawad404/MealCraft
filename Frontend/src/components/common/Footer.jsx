import { Link } from 'react-router-dom';
import Brand from './Brand';

const columns = [
  {
    heading: 'Explore',
    items: [
      { label: 'Home', to: '/' },
      { label: 'Add a recipe', to: '/add' },
    ],
  },
];

const iconClass = 'h-[18px] w-[18px] shrink-0';

function PortfolioIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className={iconClass}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.5" />
      <path d="M2.5 12h19" />
      <path d="M12 2.5a14.5 14.5 0 0 1 0 19 14.5 14.5 0 0 1 0-19Z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill="currentColor" aria-hidden="true">
      <path d="M12 .5a11.5 11.5 0 0 0-3.63 22.42c.57.1.78-.25.78-.55v-2.15c-3.2.7-3.88-1.37-3.88-1.37-.52-1.34-1.28-1.7-1.28-1.7-1.05-.71.08-.7.08-.7 1.16.09 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.25 5.69.41.36.78 1.06.78 2.14v3.17c0 .3.2.66.79.55A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13Zm1.78 13.02H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

const social = [
  { label: 'Portfolio', href: 'https://notjawad404.vercel.app/', Icon: PortfolioIcon },
  { label: 'GitHub', href: 'https://github.com/notjawad404', Icon: GitHubIcon },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/notjawad404/', Icon: LinkedInIcon },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-ink-200 bg-paper-100 dark:border-night-700 dark:bg-night-800">
      <div className="grain" aria-hidden="true" />

      <div className="shell relative grid gap-12 py-16 md:grid-cols-[1.6fr_1fr_1fr]">
        <div className="max-w-sm">
          <Brand />
          <p className="mt-5 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
            A quiet place for the recipes worth keeping. Write it down once, cook
            it for years — no life story before the ingredient list.
          </p>
        </div>

        {columns.map(({ heading, items }) => (
          <div key={heading}>
            <h3 className="font-sans text-[11px] font-semibold uppercase tracking-ultra text-ink-500 dark:text-ink-400">
              {heading}
            </h3>
            <ul className="mt-5 space-y-3 text-sm">
              {items.map(({ label, to }) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="link-underline text-ink-700 transition-colors hover:text-ember-700 dark:text-ink-200 dark:hover:text-ember-300"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h3 className="font-sans text-[11px] font-semibold uppercase tracking-ultra text-ink-500 dark:text-ink-400">
            Built by
          </h3>
          <p className="mt-5 text-sm text-ink-700 dark:text-ink-200">Jawad Ali</p>
          <ul className="mt-3 space-y-3 text-sm">
            {social.map(({ label, href, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-2.5 text-ink-700 transition-colors hover:text-ember-700 dark:text-ink-200 dark:hover:text-ember-300"
                >
                  <Icon />
                  <span className="link-underline group-hover:after:w-full">{label}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="relative border-t border-ink-200 dark:border-night-700">
        <div className="shell flex flex-col gap-2 py-6 text-xs text-ink-500 dark:text-ink-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} MealCraft</p>
          <p>Made for people who cook.</p>
        </div>
      </div>
    </footer>
  );
}
