import { useId, useRef } from 'react';
import { NUTRIENT_OPTIONS, NUTRIENT_UNITS, unitForNutrient } from '../../lib/recipes';

const emptyRow = () => ({ name: '', amount: '', unit: 'g' });

// Typing a name that is one of the known nutrients fills its usual unit in.
const knownUnit = (name) => {
  const match = name.trim().toLowerCase();
  const option = NUTRIENT_OPTIONS.find(
    (entry) => entry.value === match || entry.label.toLowerCase() === match,
  );
  return option ? option.unit : null;
};

/**
 * The per-serving nutrition table: a name, an amount and a unit per row.
 *
 * The name is an ordinary text box backed by a datalist rather than a select,
 * because the list of nutrients someone might know a figure for is longer than
 * any list worth scrolling — the suggestions are there to save typing, not to
 * decide what counts.
 */
export default function NutritionInput({ values, onChange, error, disabled }) {
  const listId = useId();
  const focusIndex = useRef(null);

  const rows = values.length > 0 ? values : [emptyRow()];

  const setAt = (index, patch) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const addRow = () => {
    focusIndex.current = rows.length;
    onChange([...rows, emptyRow()]);
  };

  const removeRow = (index) =>
    onChange(rows.length === 1 ? [emptyRow()] : rows.filter((_, i) => i !== index));

  const setName = (index, name) => {
    const unit = knownUnit(name);
    setAt(index, unit ? { name, unit } : { name });
  };

  return (
    <fieldset disabled={disabled}>
      <legend className="label">Nutrition, per serving</legend>

      <p className="-mt-1 mb-3 text-sm leading-relaxed text-ink-500 dark:text-ink-400">
        Only if you know the figures — an incomplete table is more use than a
        guessed one. Calories go in the field above.
      </p>

      <datalist id={listId}>
        {NUTRIENT_OPTIONS.map((option) => (
          <option key={option.value} value={option.label} />
        ))}
      </datalist>

      <ul className="space-y-2">
        {rows.map((row, index) => (
          // Rows carry no id of their own and cannot be reordered, so the
          // index is a safe key.
          <li key={index} className="flex items-center gap-2">
            <input
              type="text"
              value={row.name}
              onChange={(e) => setName(index, e.target.value)}
              list={listId}
              ref={(el) => {
                if (el && focusIndex.current === index) {
                  focusIndex.current = null;
                  el.focus();
                }
              }}
              placeholder={index === 0 ? 'Protein' : 'Another nutrient'}
              aria-label={`Nutrient ${index + 1}`}
              maxLength={40}
              className="field min-w-0 flex-1 py-2.5 text-sm"
            />

            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={row.amount}
              onChange={(e) => setAt(index, { amount: e.target.value })}
              placeholder="0"
              aria-label={`Amount for nutrient ${index + 1}`}
              className="field w-24 shrink-0 py-2.5 text-sm"
            />

            <select
              value={row.unit}
              onChange={(e) => setAt(index, { unit: e.target.value })}
              aria-label={`Unit for nutrient ${index + 1}`}
              className="field w-20 shrink-0 cursor-pointer py-2.5 text-sm"
            >
              {NUTRIENT_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => removeRow(index)}
              aria-label={`Remove nutrient ${index + 1}`}
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
        Add nutrient
      </button>

      {error && <p className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
    </fieldset>
  );
}
