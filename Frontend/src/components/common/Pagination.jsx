const GAP = 'gap';

/**
 * First, last and the pages either side of the current one, with gaps collapsed
 * to an ellipsis: 1 … 4 5 6 … 20.
 */
function pageItems(page, pages) {
  const wanted = [1, pages, page - 1, page, page + 1]
    .filter((n) => n >= 1 && n <= pages)
    .sort((a, b) => a - b);

  const items = [];
  let previous = 0;
  for (const n of wanted) {
    if (n === previous) continue;
    if (previous && n - previous > 1) items.push(GAP);
    items.push(n);
    previous = n;
  }
  return items;
}

function Arrow({ direction, disabled, onClick }) {
  const isPrevious = direction === 'previous';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={isPrevious ? 'Previous page' : 'Next page'}
      className="grid h-10 w-10 place-items-center rounded-full border border-ink-200 text-ink-600
                 transition-colors hover:border-ink-800 hover:text-ink-900
                 disabled:pointer-events-none disabled:opacity-40
                 dark:border-night-600 dark:text-ink-300 dark:hover:border-ink-300 dark:hover:text-paper-50"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={isPrevious ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
      </svg>
    </button>
  );
}

export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;

  return (
    <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
      <Arrow direction="previous" disabled={page <= 1} onClick={() => onChange(page - 1)} />

      {pageItems(page, pages).map((item, index) =>
        item === GAP ? (
          <span
            key={`gap-${index}`}
            aria-hidden="true"
            className="px-1 text-sm text-ink-400 dark:text-ink-500"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-label={`Page ${item}`}
            aria-current={item === page ? 'page' : undefined}
            className={`h-10 min-w-10 rounded-full px-3 text-sm font-semibold tabular-nums transition-colors ${
              item === page
                ? 'bg-ember-600 text-paper-50 dark:bg-ember-500 dark:text-night-900'
                : 'text-ink-600 hover:bg-paper-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-night-700 dark:hover:text-paper-50'
            }`}
          >
            {item}
          </button>
        ),
      )}

      <Arrow direction="next" disabled={page >= pages} onClick={() => onChange(page + 1)} />
    </nav>
  );
}
