import { useEffect, useRef } from 'react';
import FormAlert from './FormAlert';

/**
 * A yes/no question for actions that cannot be undone. Built on <dialog>.
 *
 * The caller owns `pending` and `error`, so the dialog stays open over a
 * failure rather than closing on one.
 */
export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  pending = false,
  error = '',
  onConfirm,
  onClose,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      // Escape is refused until the request settles.
      onCancel={(e) => {
        if (pending) e.preventDefault();
      }}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current && !pending) onClose();
      }}
      className="app-dialog m-auto w-full max-w-md bg-transparent p-0"
    >
      <div className="space-y-5 rounded-[1.5rem] bg-paper-50 p-7 text-left shadow-lift dark:bg-night-800">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-ink-900 dark:text-paper-50">
            {title}
          </h2>
          {body && (
            <p className="mt-3 text-[15px] leading-relaxed text-ink-600 dark:text-ink-300">
              {body}
            </p>
          )}
        </div>

        <FormAlert>{error}</FormAlert>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {/* Focused on open, so a stray Return cancels rather than confirms. */}
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            autoFocus
            className="btn-ghost px-5 py-2.5 disabled:pointer-events-none disabled:opacity-60"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="btn bg-red-600 px-5 py-2.5 text-paper-50 shadow-card
                       hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-lift active:translate-y-0
                       disabled:pointer-events-none disabled:opacity-60
                       dark:bg-red-500 dark:hover:bg-red-400 dark:hover:text-night-900"
          >
            {pending && (
              <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            )}
            {pending ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
