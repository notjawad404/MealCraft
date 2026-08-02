import { Link } from 'react-router-dom';

const categories = [
  'Weeknight', 'Slow-cooked', 'Baking', 'Vegetarian',
  'One-pan', 'Desserts', 'Breakfast', 'Grilling',
];

const principles = [
  {
    n: 'I',
    title: 'The recipe, and nothing else',
    body:
      'Ingredients, timing, method. No autobiography, no ad break between step three and step four.',
  },
  {
    n: 'II',
    title: 'Public or private, per recipe',
    body:
      'Publish the ones you are proud of. Keep the experiments to yourself. Change your mind whenever you like.',
  },
  {
    n: 'III',
    title: 'It stays yours',
    body:
      'Every recipe is tied to your account. Only you can edit or delete what you wrote.',
  },
];

const steps = [
  {
    n: '01',
    title: 'Make an account',
    body: 'One sign-up, and your cookbook follows you to every device.',
  },
  {
    n: '02',
    title: 'Write it down',
    body: 'Add the ingredients and method while it is fresh, then mark it public or private.',
  },
  {
    n: '03',
    title: 'Cook it again',
    body: 'Come back in six months and it is exactly where you left it — no screenshot archaeology.',
  },
];

export default function Home() {
  return (
    <>
      {/* ───────────────────────── Hero ───────────────────────── */}
      <section className="relative overflow-hidden border-b border-ink-200 dark:border-night-700">
        <div className="grain" aria-hidden="true" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-ember-200/40 blur-3xl dark:bg-ember-800/25"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-40 top-72 h-96 w-96 rounded-full bg-sage-100/70 blur-3xl dark:bg-sage-900/30"
        />

        <div className="shell relative grid items-center gap-16 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
          <div className="animate-fade-up">
            <p className="eyebrow flex items-center gap-3">
              <span className="h-px w-8 bg-ember-600 dark:bg-ember-300" aria-hidden="true" />
              Your digital cookbook
            </p>

            <h1 className="mt-7 font-display text-[2.75rem] font-semibold leading-[1.03] tracking-tight text-ink-900 dark:text-paper-50 sm:text-6xl lg:text-[4.25rem]">
              Keep the recipes
              <br />
              worth cooking
              <em className="not-italic text-ember-600 dark:text-ember-300"> twice.</em>
            </h1>

            <p className="lede mt-7 max-w-xl">
              MealCraft is where home cooks write down what actually worked — and
              swap the ones worth passing on. Calm, uncluttered, and free of the
              thousand-word preamble.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link to="/add" className="btn-primary">
                Share a recipe
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
              <a href="#how-it-works" className="btn-ghost">
                See how it works
              </a>
            </div>

            <dl className="mt-14 grid max-w-md grid-cols-3 gap-6 border-t border-ink-200 pt-8 dark:border-night-700">
              {[
                ['2 min', 'to add a recipe'],
                ['Zero', 'ads or pop-ups'],
                ['Always', 'yours to delete'],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="font-display text-2xl font-semibold text-ink-900 dark:text-paper-50">
                    {value}
                  </dt>
                  <dd className="mt-1 text-xs leading-relaxed text-ink-500 dark:text-ink-400">
                    {label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Recipe cards, composed from markup — the app ships no images. */}
          <div className="relative mx-auto w-full max-w-sm animate-fade-in lg:mx-0 lg:ml-auto">
            {/* Back card */}
            <div className="absolute -left-6 top-8 hidden w-full rotate-[-6deg] rounded-[1.75rem] border border-ink-200 bg-paper-100 p-6 shadow-card dark:border-night-600 dark:bg-night-700 sm:block">
              <div className="h-36 rounded-2xl bg-sage-300/50 dark:bg-sage-700/40" />
              <div className="mt-5 h-3 w-2/3 rounded-full bg-ink-200 dark:bg-night-600" />
              <div className="mt-3 h-3 w-1/3 rounded-full bg-ink-200 dark:bg-night-600" />
            </div>

            {/* Front card */}
            <article className="relative animate-drift rounded-[1.75rem] border border-ink-200 bg-white p-6 shadow-lift dark:border-night-600 dark:bg-night-800">
              <div className="relative grid h-40 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-ember-400 via-ember-500 to-ember-700">
                <div className="grain" aria-hidden="true" />
                <svg viewBox="0 0 24 24" className="relative h-14 w-14 text-paper-50/90" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 3v8a3 3 0 0 0 6 0V3M10 3v18M17.5 3c-1.3 1.7-2 3.8-2 6 0 1.7.7 2.9 2 3.5V21" />
                </svg>
                <span className="absolute right-3 top-3 rounded-full bg-paper-50/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-ember-700">
                  Public
                </span>
              </div>

              <h3 className="mt-6 font-display text-xl font-semibold leading-snug text-ink-900 dark:text-paper-50">
                Lemon &amp; Herb Roast Chicken
              </h3>

              <div className="mt-3 flex items-center gap-4 text-sm text-ink-500 dark:text-ink-400">
                <span className="inline-flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                  90 min
                </span>
                <span className="h-1 w-1 rounded-full bg-ink-300 dark:bg-night-600" aria-hidden="true" />
                <span>by User</span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2 border-t border-ink-100 pt-5 dark:border-night-700">
                {['Chicken', 'Lemon', 'Thyme', 'Garlic'].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-paper-100 px-3 py-1 text-xs font-medium text-ink-600 dark:bg-night-700 dark:text-ink-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ──────────────── Category band ──────────────── */}
      <section className="border-b border-ink-200 bg-paper-100 dark:border-night-700 dark:bg-night-800">
        <div className="shell flex flex-wrap items-center justify-center gap-x-8 gap-y-3 py-6">
          {categories.map((c) => (
            <span
              key={c}
              className="text-[11px] font-semibold uppercase tracking-ultra text-ink-400 dark:text-ink-500"
            >
              {c}
            </span>
          ))}
        </div>
      </section>

      {/* ──────────────── Principles ──────────────── */}
      <section className="shell py-24">
        <div className="max-w-2xl">
          <p className="eyebrow">Why it feels different</p>
          <h2 className="mt-5 font-display text-4xl font-semibold leading-tight tracking-tight text-ink-900 dark:text-paper-50 sm:text-5xl">
            Built for the way you actually cook
          </h2>
        </div>

        <div className="mt-16 grid gap-x-10 gap-y-12 md:grid-cols-3">
          {principles.map(({ n, title, body }) => (
            <article key={n} className="group border-t border-ink-300 pt-6 dark:border-night-600">
              <span className="font-display text-sm font-semibold tracking-widest text-ember-600 dark:text-ember-300">
                {n}
              </span>
              <h3 className="mt-4 font-display text-2xl font-semibold leading-snug text-ink-900 dark:text-paper-50">
                {title}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-600 dark:text-ink-300">
                {body}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ──────────────── How it works ──────────────── */}
      <section
        id="how-it-works"
        className="scroll-mt-24 border-y border-ink-200 bg-paper-100 dark:border-night-700 dark:bg-night-800"
      >
        <div className="shell py-24">
          <div className="max-w-2xl">
            <p className="eyebrow">Getting started</p>
            <h2 className="mt-5 font-display text-4xl font-semibold leading-tight tracking-tight text-ink-900 dark:text-paper-50 sm:text-5xl">
              Three steps to your first recipe
            </h2>
          </div>

          <ol className="mt-16 grid gap-12 md:grid-cols-3">
            {steps.map(({ n, title, body }) => (
              <li key={n} className="relative">
                <span
                  className="font-display text-6xl font-semibold leading-none text-ink-200 dark:text-night-600"
                  aria-hidden="true"
                >
                  {n}
                </span>
                <h3 className="mt-5 font-display text-2xl font-semibold text-ink-900 dark:text-paper-50">
                  {title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-600 dark:text-ink-300">
                  {body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ──────────────── Closing CTA ──────────────── */}
      <section className="shell py-24">
        <div className="relative overflow-hidden rounded-[2rem] bg-ink-900 px-8 py-20 text-center dark:bg-night-800 sm:px-16">
          <div className="grain" aria-hidden="true" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-ember-600/30 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-sage-700/25 blur-3xl"
          />

          <div className="relative mx-auto max-w-2xl">
            <p className="eyebrow text-ember-300">Ready when you are</p>
            <h2 className="mt-5 font-display text-4xl font-semibold leading-tight tracking-tight text-paper-50 sm:text-5xl">
              Start with the one you cook most
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-300">
              The recipe you already know by heart. It takes about two minutes,
              and then it is written down for good.
            </p>
            <Link to="/add" className="btn-invert mt-10">
              Share your first recipe
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
