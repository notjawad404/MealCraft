import { Link } from 'react-router-dom';
import Brand from './Brand';

const columns = [
  {
    heading: 'Explore',
    items: [
      { label: 'Home', to: '/' },
      { label: 'Add a recipe', to: '/add' },
      { label: 'How it works', to: '/#how-it-works' },
    ],
  },
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
            Built with
          </h3>
          <ul className="mt-5 space-y-3 text-sm text-ink-700 dark:text-ink-200">
            <li>React &amp; Vite</li>
            <li>Tailwind CSS</li>
            <li>Node, Express &amp; MongoDB</li>
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
