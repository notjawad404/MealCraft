import { nutrientLabel } from '../../lib/recipes';

/** The per-serving figures. Nothing is inferred; unlisted means absent. */
export default function NutritionTable({ calories, nutrients = [], servings }) {
  if (calories === null && nutrients.length === 0) return null;

  return (
    <section className="rounded-2xl border border-ink-200 p-5 dark:border-night-600">
      <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-paper-50">
        Nutrition
      </h3>
      <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-ink-400 dark:text-ink-500">
        Per serving{servings ? ` · makes ${servings}` : ''}
      </p>

      {calories !== null && calories !== undefined && (
        <p className="mt-4 flex items-baseline gap-2">
          <span className="font-display text-3xl font-semibold text-ink-900 dark:text-paper-50">
            {calories}
          </span>
          <span className="text-sm text-ink-500 dark:text-ink-400">kcal</span>
        </p>
      )}

      {nutrients.length > 0 && (
        <dl className="mt-4 divide-y divide-ink-100 border-t border-ink-100 dark:divide-night-700 dark:border-night-700">
          {nutrients.map(({ name, amount, unit }) => (
            <div key={name} className="flex items-baseline justify-between gap-4 py-2">
              <dt className="text-sm text-ink-600 dark:text-ink-300">{nutrientLabel(name)}</dt>
              <dd className="text-sm font-semibold tabular-nums text-ink-900 dark:text-paper-50">
                {amount}
                <span className="ml-1 font-normal text-ink-400 dark:text-ink-500">{unit}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}

      <p className="mt-4 text-xs leading-relaxed text-ink-400 dark:text-ink-500">
        Figures come from whoever wrote the recipe. Anything they did not fill in
        is left out rather than guessed at.
      </p>
    </section>
  );
}
