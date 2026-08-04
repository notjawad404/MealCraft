import { useRef } from 'react';

/** One row per ingredient; RecipeForm joins them with newlines on submit. */
export default function IngredientsInput({ values, onChange, error, disabled }) {
  // Focus the row just added.
  const focusIndex = useRef(null);

  const setAt = (index, next) =>
    onChange(values.map((value, i) => (i === index ? next : value)));

  const addRow = () => {
    focusIndex.current = values.length;
    onChange([...values, '']);
  };

  const removeRow = (index) =>
    onChange(values.length === 1 ? [''] : values.filter((_, i) => i !== index));

  // Enter adds the next row rather than submitting the form.
  const onKeyDown = (index) => (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (index === values.length - 1) addRow();
    else focusIndex.current = index + 1;
  };

  return (
    <fieldset disabled={disabled}>
      <legend className="label">Ingredients</legend>

      <ul className="space-y-2">
        {values.map((value, index) => (
          // Rows have no id and cannot be reordered, so the index is safe.
          <li key={index} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="w-5 shrink-0 text-right text-xs font-semibold tabular-nums text-ink-400 dark:text-ink-500"
            >
              {index + 1}
            </span>

            <input
              type="text"
              value={value}
              onChange={(e) => setAt(index, e.target.value)}
              onKeyDown={onKeyDown(index)}
              ref={(el) => {
                if (el && focusIndex.current === index) {
                  focusIndex.current = null;
                  el.focus();
                }
              }}
              placeholder={index === 0 ? '2 tbsp olive oil' : 'Another ingredient'}
              aria-label={`Ingredient ${index + 1}`}
              className="field"
            />

            <button
              type="button"
              onClick={() => removeRow(index)}
              aria-label={`Remove ingredient ${index + 1}`}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-400 transition-colors
                         hover:bg-red-50 hover:text-red-700
                         dark:hover:bg-red-950/40 dark:hover:text-red-300"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={addRow}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-ink-300 px-4 py-2
                   text-xs font-semibold text-ink-700 transition-colors hover:border-ink-800 hover:bg-white
                   dark:border-night-600 dark:text-ink-200 dark:hover:border-ink-300 dark:hover:bg-night-800"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add ingredient
      </button>

      {error && (
        <p className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>
      )}
    </fieldset>
  );
}
