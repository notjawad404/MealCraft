import { useId, useRef, useState } from 'react';
import { ACCEPTED_TYPES, ImageError, fileToDataUrl, formatBytes } from '../../lib/image';

/**
 * Picks an image and hands back a base64 data URI, ready to be stored on the
 * recipe document. Encoding happens here rather than at submit time so the size
 * of what will actually be sent is visible before anyone commits to it.
 */
export default function ImageUpload({ value, onChange, disabled }) {
  const inputId = useId();
  const inputRef = useRef(null);

  const [dragging, setDragging] = useState(false);
  const [encoding, setEncoding] = useState(false);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState(null);

  const accept = async (file) => {
    if (!file) return;
    setError('');
    setEncoding(true);
    try {
      const result = await fileToDataUrl(file);
      onChange(result.dataUrl);
      setMeta({ bytes: result.bytes, width: result.width, height: result.height });
    } catch (err) {
      onChange('');
      setMeta(null);
      setError(err instanceof ImageError ? err.message : 'That image could not be processed.');
    } finally {
      setEncoding(false);
      // Let the same file be picked again after a removal.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const clear = () => {
    onChange('');
    setMeta(null);
    setError('');
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled) accept(e.dataTransfer.files?.[0]);
  };

  return (
    <div>
      <span className="label">Photo · optional</span>

      {value ? (
        <figure className="overflow-hidden rounded-2xl border border-ink-200 bg-white dark:border-night-600 dark:bg-night-800">
          <img
            src={value}
            alt="Preview of the photo attached to this recipe"
            className="h-56 w-full object-cover"
          />
          <figcaption className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <span className="text-xs text-ink-500 dark:text-ink-400">
              {meta
                ? `${meta.width}×${meta.height} · ${formatBytes(meta.bytes)} stored`
                : 'Attached'}
            </span>
            <span className="flex gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={disabled}
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:bg-paper-100 disabled:opacity-50 dark:text-ink-200 dark:hover:bg-night-700"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={clear}
                disabled={disabled}
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-950/40"
              >
                Remove
              </button>
            </span>
          </figcaption>
        </figure>
      ) : (
        <label
          htmlFor={inputId}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed
                      px-6 py-10 text-center transition-colors
                      ${
                        dragging
                          ? 'border-ember-500 bg-ember-50 dark:border-ember-400 dark:bg-night-700'
                          : 'border-ink-300 bg-white hover:border-ink-400 dark:border-night-600 dark:bg-night-900 dark:hover:border-night-600'
                      }
                      ${disabled ? 'pointer-events-none opacity-60' : ''}`}
        >
          {encoding ? (
            <svg viewBox="0 0 24 24" className="h-6 w-6 animate-spin text-ember-600 dark:text-ember-300" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.2" opacity="0.25" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-ink-400" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
              <circle cx="8.5" cy="10" r="1.5" />
              <path d="m4 16.5 4.5-4 3.5 3 3-2.5 5 4" />
            </svg>
          )}

          <span className="text-sm font-semibold text-ink-800 dark:text-ink-100">
            {encoding ? 'Preparing your photo…' : 'Drop a photo here, or browse'}
          </span>
          <span className="text-xs text-ink-500 dark:text-ink-400">
            JPEG, PNG, WebP or GIF. Large photos are resized automatically.
          </span>
        </label>
      )}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => accept(e.target.files?.[0])}
      />

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
