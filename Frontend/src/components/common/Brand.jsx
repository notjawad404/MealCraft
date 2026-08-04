import { Link } from 'react-router-dom';

/** MealCraft mark and wordmark, drawn inline as SVG. */
export default function Brand({ to = '/', className = '', invert = false }) {
  const content = (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ember-600 dark:bg-ember-500">
        <svg viewBox="0 0 32 32" className="h-[18px] w-[18px]" fill="none" aria-hidden="true">
          <path
            d="M16 6a5.5 5.5 0 0 1 5.05 3.34A5.5 5.5 0 0 1 23.5 19.6v1.65h-15V19.6A5.5 5.5 0 0 1 10.95 9.34 5.5 5.5 0 0 1 16 6Z"
            fill="#FCF9F4"
          />
          <rect x="8.5" y="23.25" width="15" height="3.25" rx="1.6" fill="#FCF9F4" />
        </svg>
      </span>
      <span
        className={`font-display text-[22px] font-semibold leading-none tracking-tight ${
          invert ? 'text-paper-50' : 'text-ink-900 dark:text-paper-50'
        }`}
      >
        Meal<span className="text-ember-600 dark:text-ember-300">Craft</span>
      </span>
    </span>
  );

  if (!to) return content;

  return (
    <Link to={to} className="rounded-xl" aria-label="MealCraft — home">
      {content}
    </Link>
  );
}
