/** The eyebrow / title / lede block that opens the listing pages. */
export default function PageHeader({ eyebrow, title, subtitle, action }) {
  return (
    <header className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-xl">
        <p className="eyebrow flex items-center gap-3">
          <span className="h-px w-8 bg-ember-600 dark:bg-ember-300" aria-hidden="true" />
          {eyebrow}
        </p>

        <h1 className="mt-6 font-display text-4xl font-semibold leading-tight tracking-tight text-ink-900 dark:text-paper-50 sm:text-5xl">
          {title}
        </h1>

        {subtitle && (
          <p className="mt-5 text-[15px] leading-relaxed text-ink-600 dark:text-ink-300">
            {subtitle}
          </p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
