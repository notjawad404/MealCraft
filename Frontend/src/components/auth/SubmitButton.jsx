export default function SubmitButton({ pending, pendingLabel, children }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary w-full disabled:pointer-events-none disabled:opacity-60"
    >
      {pending && (
        <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )}
      {pending ? pendingLabel : children}
    </button>
  );
}
