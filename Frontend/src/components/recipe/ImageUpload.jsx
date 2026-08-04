import { useEffect, useId, useRef, useState } from 'react';
import { ACCEPTED_TYPES, ImageError, formatBytes, optimizeImage } from '../../lib/image';

/**
 * Picks a photo, shrinks it, and hands back the Blob that will be uploaded.
 *
 * The work happens here rather than at submit time so the cost of the picture
 * is visible before anyone commits to it — and so a 6 MB phone photo has
 * already become a couple of hundred kilobytes by the time Save is pressed.
 *
 * `onChange` receives `{ file, url }`. `file` is a newly picked Blob to upload;
 * `url` is the photo the recipe already has, which on an edit is the Cloudinary
 * URL the backend wrote last time. Both are null/'' once the photo is removed.
 */
export default function ImageUpload({ file, url, onChange, disabled }) {
  const inputId = useId();
  const inputRef = useRef(null);

  const [dragging, setDragging] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState(null);
  const [preview, setPreview] = useState('');

  // A Blob has no address until one is minted for it, and each one holds the
  // Blob in memory until it is revoked — hence the cleanup on replacement and
  // on unmount. A photo the recipe already has is just a URL and needs neither.
  useEffect(() => {
    if (!file) {
      setPreview('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const accept = async (picked) => {
    if (!picked) return;
    setError('');
    setWorking(true);
    try {
      const result = await optimizeImage(picked);
      onChange({ file: result.blob, url: '' });
      setMeta(result);
    } catch (err) {
      onChange({ file: null, url: '' });
      setMeta(null);
      setError(err instanceof ImageError ? err.message : 'That image could not be processed.');
    } finally {
      setWorking(false);
      // Let the same file be picked again after a removal.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const clear = () => {
    onChange({ file: null, url: '' });
    setMeta(null);
    setError('');
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled) accept(e.dataTransfer.files?.[0]);
  };

  const shown = preview || url;

  return (
    <div>
      <span className="label">Photo · optional</span>

      {shown ? (
        <figure className="overflow-hidden rounded-2xl border border-ink-200 bg-white dark:border-night-600 dark:bg-night-800">
          <img
            src={shown}
            alt="Preview of the photo attached to this recipe"
            className="h-56 w-full object-cover"
          />
          <figcaption className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <span className="text-xs text-ink-500 dark:text-ink-400">
              {meta ? (
                <>
                  {meta.width}×{meta.height} ·{' '}
                  {meta.originalBytes > meta.bytes ? (
                    <>
                      <span className="line-through opacity-60">{formatBytes(meta.originalBytes)}</span>{' '}
                      → <span className="font-semibold text-sage-700 dark:text-sage-300">{formatBytes(meta.bytes)}</span>
                    </>
                  ) : (
                    formatBytes(meta.bytes)
                  )}
                </>
              ) : (
                'Attached'
              )}
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
          {working ? (
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
            {working ? 'Shrinking your photo…' : 'Drop a photo here, or browse'}
          </span>
          <span className="text-xs text-ink-500 dark:text-ink-400">
            JPEG, PNG, WebP or GIF. Large photos are resized and compressed automatically.
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
