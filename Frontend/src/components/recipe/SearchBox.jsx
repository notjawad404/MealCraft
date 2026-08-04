import { useEffect, useId, useRef, useState } from 'react';
import useDebouncedValue from '../../hooks/useDebouncedValue';

// Shorter than the list's own debounce.
const SUGGEST_DELAY = 180;
const MIN_CHARS = 2;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Splits a title around the typed term, for highlighting. */
function highlight(title, term) {
  if (!term) return [title];
  const parts = title.split(new RegExp(`(${escapeRegex(term)})`, 'i'));
  return parts.filter(Boolean);
}

/**
 * Search input with a type-ahead list of matching titles. Behaves as a
 * combobox. Without `fetchSuggestions` it is a plain search box.
 */
export default function SearchBox({ value, onChange, placeholder, fetchSuggestions }) {
  const inputId = useId();
  const listId = `${inputId}-suggestions`;

  const [items, setItems] = useState([]);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [active, setActive] = useState(-1);

  const term = useDebouncedValue(value.trim(), SUGGEST_DELAY);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!fetchSuggestions || term.length < MIN_CHARS) {
      setItems([]);
      return undefined;
    }

    const controller = new AbortController();

    fetchSuggestions({ search: term, signal: controller.signal })
      .then((data) => {
        setItems(data?.suggestions ?? []);
        setActive(-1);
      })
      // A failing type-ahead is silent; the list below reports real errors.
      .catch(() => {
        if (!controller.signal.aborted) setItems([]);
      });

    return () => controller.abort();
  }, [fetchSuggestions, term]);

  const open = focused && !dismissed && items.length > 0;

  const update = (next) => {
    onChange(next);
    setDismissed(false);
  };

  const pick = (title) => {
    onChange(title);
    setDismissed(true);
    setActive(-1);
    inputRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      setDismissed(true);
      return;
    }
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      pick(items[active].title);
    }
  };

  return (
    <div className="relative flex-1">
      <label htmlFor={inputId} className="sr-only">
        Search recipes
      </label>

      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </svg>

      <input
        ref={inputRef}
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={value}
        onChange={(e) => update(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className="field pl-11 pr-10"
      />

      {value && (
        <button
          type="button"
          onClick={() => update('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg
                     text-ink-400 transition-colors hover:text-ink-800 dark:hover:text-ink-100"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching recipes"
          // Keeps focus, so the click lands before blur closes the list.
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border
                     border-ink-200 bg-white py-1.5 shadow-lift
                     dark:border-night-600 dark:bg-night-800"
        >
          {items.map((item, index) => (
            <li key={item._id} id={`${listId}-${index}`} role="option" aria-selected={index === active}>
              <button
                type="button"
                onClick={() => pick(item.title)}
                onMouseEnter={() => setActive(index)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                  index === active
                    ? 'bg-paper-100 text-ink-900 dark:bg-night-700 dark:text-paper-50'
                    : 'text-ink-700 dark:text-ink-200'
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ink-400" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 3v8a3 3 0 0 0 6 0V3M10 3v18M17.5 3c-1.3 1.7-2 3.8-2 6 0 1.7.7 2.9 2 3.5V21" />
                </svg>
                <span className="truncate">
                  {highlight(item.title, term).map((part, i) =>
                    part.toLowerCase() === term.toLowerCase() ? (
                      <mark
                        key={i}
                        className="bg-transparent font-semibold text-ember-700 dark:text-ember-300"
                      >
                        {part}
                      </mark>
                    ) : (
                      <span key={i}>{part}</span>
                    ),
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
