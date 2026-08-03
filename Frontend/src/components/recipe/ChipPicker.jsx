import { useId, useState } from 'react';

// Tailwind only sees class names that appear literally in the source, so the
// two tones are written out in full rather than built from a colour prop.
const TONES = {
  ember: 'border-ember-600 bg-ember-600 text-paper-50 dark:border-ember-500 dark:bg-ember-500 dark:text-night-900',
  sage: 'border-sage-700 bg-sage-700 text-paper-50 dark:border-sage-500 dark:bg-sage-500 dark:text-night-900',
};

const UNSELECTED =
  'border-ink-300 text-ink-700 hover:border-ink-800 hover:bg-white ' +
  'dark:border-night-600 dark:text-ink-200 dark:hover:border-ink-300 dark:hover:bg-night-800';

const CHIP =
  'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold ' +
  'transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40';

/** Trim and collapse the spacing, the way the API stores these. */
const tidy = (value) => value.trim().replace(/\s+/g, ' ');

/**
 * A multi-select rendered as toggleable chips, optionally letting the user type
 * their own on the end. `selected` is a plain array of stored values — for the
 * allergen list that is a mix of known slugs and free text, so anything not in
 * `options` is shown as its own removable chip rather than dropped.
 *
 * Pass `custom` to enable the free-text row:
 * `{ placeholder, addLabel, suggestions?, preserveCase? }`.
 */
export default function ChipPicker({
  legend,
  hint,
  options,
  selected = [],
  onChange,
  labelOf,
  tone = 'ember',
  custom,
  max,
  error,
  disabled,
}) {
  const listId = useId();
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');

  const chosen = new Set(selected);
  const known = new Set(options.map((option) => option.value));
  const extras = selected.filter((value) => !known.has(value));

  const full = max !== undefined && selected.length >= max;

  const toggle = (value) => {
    setNotice('');
    if (chosen.has(value)) {
      onChange(selected.filter((entry) => entry !== value));
      return;
    }
    if (full) {
      setNotice(`That is the limit of ${max}.`);
      return;
    }
    onChange([...selected, value]);
  };

  const addDraft = () => {
    // Proper nouns keep their capitals; tags are stored lower-case.
    const tidied = tidy(draft);
    const value = custom?.preserveCase ? tidied : tidied.toLowerCase();
    if (!value) return;

    // Someone typing "tree nuts" means the option two rows up, not a second
    // tag beside it. Match on the wording as well as the stored value.
    const lower = value.toLowerCase();
    const matched = options.find(
      (option) => option.value === lower || option.label.toLowerCase() === lower,
    );
    const next = matched ? matched.value : value;

    setDraft('');
    setNotice('');
    // Case-insensitively, so "Italy" cannot be added under an existing "italy".
    if (selected.some((entry) => entry.toLowerCase() === next.toLowerCase())) return;
    if (full) {
      setNotice(`That is the limit of ${max}.`);
      return;
    }
    onChange([...selected, next]);
  };

  // Enter here means "add this one", not "submit the recipe".
  const onDraftKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    addDraft();
  };

  const selectedClass = TONES[tone];

  return (
    <fieldset disabled={disabled}>
      <legend className="label">{legend}</legend>

      {hint && (
        <p className="-mt-1 mb-3 text-sm leading-relaxed text-ink-500 dark:text-ink-400">
          {hint}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {options.map(({ value, label }) => {
          const isChosen = chosen.has(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => toggle(value)}
              aria-pressed={isChosen}
              disabled={full && !isChosen}
              className={`${CHIP} ${isChosen ? selectedClass : UNSELECTED}`}
            >
              {isChosen && (
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
              )}
              {label}
            </button>
          );
        })}

        {extras.map((value) => (
          <span key={value} className={`${CHIP} ${selectedClass}`}>
            {labelOf ? labelOf(value) : value}
            <button
              type="button"
              onClick={() => toggle(value)}
              aria-label={`Remove ${labelOf ? labelOf(value) : value}`}
              className="-mr-1 grid h-4 w-4 place-items-center rounded-full transition-opacity hover:opacity-70"
            >
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </span>
        ))}
      </div>

      {custom && (
        <div className="mt-3 flex gap-2">
          {custom.suggestions && (
            <datalist id={listId}>
              {custom.suggestions.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          )}

          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onDraftKeyDown}
            list={custom.suggestions ? listId : undefined}
            placeholder={custom.placeholder}
            aria-label={custom.addLabel}
            maxLength={60}
            className="field max-w-xs py-2 text-sm"
          />
          <button
            type="button"
            onClick={addDraft}
            disabled={!draft.trim()}
            className="shrink-0 rounded-full border border-ink-300 px-4 py-2 text-xs font-semibold text-ink-700
                       transition-colors hover:border-ink-800 hover:bg-white disabled:opacity-40
                       dark:border-night-600 dark:text-ink-200 dark:hover:border-ink-300 dark:hover:bg-night-800"
          >
            {custom.addLabel}
          </button>
        </div>
      )}

      {error ? (
        <p className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>
      ) : notice ? (
        <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">{notice}</p>
      ) : null}
    </fieldset>
  );
}
