/** Form-level error banner — server rejections, unreachable API, and so on. */
export default function FormAlert({ children }) {
  if (!children) return null;

  return (
    <p
      role="alert"
      className="flex items-start gap-3 rounded-2xl border border-red-300 bg-red-50 px-4 py-3.5
                 text-sm leading-relaxed text-red-800
                 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
    >
      <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5M12 16.2v.3" />
      </svg>
      {children}
    </p>
  );
}
