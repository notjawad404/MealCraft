import { useState } from 'react';

/**
 * Labelled input with inline validation messaging. Password inputs get a
 * reveal toggle so people can check what they typed instead of a confirm field.
 */
export default function Field({
  id,
  label,
  type = 'text',
  value,
  onChange,
  error,
  hint,
  autoComplete,
  placeholder,
}) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === 'password';
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          name={id}
          type={isPassword && revealed ? 'text' : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`field ${isPassword ? 'pr-12' : ''} ${
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-800'
              : ''
          }`}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center
                       rounded-lg text-ink-400 transition-colors hover:text-ink-700
                       dark:hover:text-ink-100"
          >
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {revealed ? (
                <>
                  <path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.8 2.8" />
                  <path d="M6.7 6.8C4.6 8.1 3 10 2 12c2 3.9 5.6 6.5 10 6.5 1.8 0 3.4-.4 4.8-1.2M9.9 5.7A10 10 0 0 1 12 5.5c4.4 0 8 2.6 10 6.5a15 15 0 0 1-3.1 4" />
                </>
              ) : (
                <>
                  <path d="M2 12c2-3.9 5.6-6.5 10-6.5S20 8.1 22 12c-2 3.9-5.6 6.5-10 6.5S4 15.9 2 12Z" />
                  <circle cx="12" cy="12" r="2.6" />
                </>
              )}
            </svg>
          </button>
        )}
      </div>

      {error ? (
        <p id={`${id}-error`} className="mt-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-2 text-sm text-ink-500 dark:text-ink-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
