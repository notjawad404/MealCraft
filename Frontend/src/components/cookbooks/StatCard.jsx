export default function StatCard({ label, value, hint, tone = 'default' }) {
  const valueTone =
    tone === 'accent'
      ? 'text-ember-700 dark:text-ember-300'
      : 'text-ink-900 dark:text-paper-50';

  return (
    <div className="surface rounded-2xl p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-500 dark:text-ink-400">
        {label}
      </p>
      <p className={`mt-2 font-display text-3xl font-semibold tracking-tight ${valueTone}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{hint}</p>}
    </div>
  );
}
