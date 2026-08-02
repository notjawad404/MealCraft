import { Link } from 'react-router-dom';

/**
 * Split shell shared by the login and register pages: the form on paper,
 * an editorial panel alongside it on wider screens.
 */
export default function AuthLayout({
  eyebrow,
  title,
  subtitle,
  children,
  altPrompt,
  altLabel,
  altTo,
  asideTitle,
  asidePoints = [],
}) {
  return (
    <div className="grid lg:grid-cols-2">
      {/* Form column */}
      <div className="relative overflow-hidden px-5 py-16 sm:px-8 lg:py-24">
        <div className="grain" aria-hidden="true" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-ember-200/35 blur-3xl dark:bg-ember-800/20"
        />

        <div className="relative mx-auto w-full max-w-md">
          <p className="eyebrow flex items-center gap-3">
            <span className="h-px w-8 bg-ember-600 dark:bg-ember-300" aria-hidden="true" />
            {eyebrow}
          </p>

          <h1 className="mt-6 font-display text-4xl font-semibold leading-tight tracking-tight text-ink-900 dark:text-paper-50">
            {title}
          </h1>

          <p className="mt-4 text-[15px] leading-relaxed text-ink-600 dark:text-ink-300">
            {subtitle}
          </p>

          <div className="mt-10">{children}</div>

          <p className="mt-8 text-sm text-ink-600 dark:text-ink-300">
            {altPrompt}{' '}
            <Link
              to={altTo}
              className="link-underline font-semibold text-ember-700 dark:text-ember-300"
            >
              {altLabel}
            </Link>
          </p>
        </div>
      </div>

      {/* Editorial panel */}
      <aside className="relative hidden overflow-hidden bg-ink-900 dark:bg-night-800 lg:block">
        <div className="grain" aria-hidden="true" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-ember-600/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-sage-700/25 blur-3xl"
        />

        <div className="relative flex h-full max-w-lg flex-col justify-center px-14 py-24">
          <h2 className="font-display text-4xl font-semibold leading-tight tracking-tight text-paper-50">
            {asideTitle}
          </h2>

          <ul className="mt-10 space-y-6">
            {asidePoints.map(({ title: pointTitle, body }) => (
              <li key={pointTitle} className="border-t border-white/15 pt-5">
                <h3 className="font-display text-lg font-semibold text-paper-50">
                  {pointTitle}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-300">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
