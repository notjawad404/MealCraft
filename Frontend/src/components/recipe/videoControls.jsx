/** The icon set and button shell shared by the player and its control bar. */

// Drawn to match the rest of the app: 24-unit box, stroked, round joins. The
// two transport glyphs are filled instead — a hairline play triangle reads as
// decoration rather than as the thing you press.
const ICONS = {
  play: <path d="M8 5.1v13.8L19 12z" fill="currentColor" stroke="none" />,
  pause: <path d="M9.5 5.5v13M14.5 5.5v13" strokeWidth="2.6" />,
  replay: <path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v4h-4" />,
  back: <path d="M11 6.5 4.5 12l6.5 5.5zM19.5 6.5 13 12l6.5 5.5z" fill="currentColor" stroke="none" />,
  forward: <path d="M13 6.5 19.5 12 13 17.5zM4.5 6.5 11 12l-6.5 5.5z" fill="currentColor" stroke="none" />,
  volume: (
    <>
      <path d="M4 9.3h3.3L12 5.4v13.2L7.3 14.7H4z" />
      <path d="M15.8 9.4a3.7 3.7 0 0 1 0 5.2M18.4 6.9a7.3 7.3 0 0 1 0 10.2" />
    </>
  ),
  muted: (
    <>
      <path d="M4 9.3h3.3L12 5.4v13.2L7.3 14.7H4z" />
      <path d="m16.2 10 4.3 4M20.5 10l-4.3 4" />
    </>
  ),
  captions: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="3" />
      <path d="M10 10.4a2.4 2.4 0 1 0 0 3.2M17 10.4a2.4 2.4 0 1 0 0 3.2" />
    </>
  ),
  theater: <rect x="2.5" y="6.5" width="19" height="11" rx="2" />,
  compact: <rect x="5" y="5" width="14" height="14" rx="2" />,
  expand: <path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" />,
  shrink: <path d="M9 4v3.5A1.5 1.5 0 0 1 7.5 9H4M20 9h-3.5A1.5 1.5 0 0 1 15 7.5V4M15 20v-3.5a1.5 1.5 0 0 1 1.5-1.5H20M4 15h3.5A1.5 1.5 0 0 1 9 16.5V20" />,
  external: <path d="M14 4h6v6M20 4l-8.6 8.6M18 14.2v4.3A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />,
  close: <path d="M6 6l12 12M18 6L6 18" strokeWidth="2" />,
};

export function Icon({ name, className = 'h-5 w-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

/**
 * A control-bar button. `label` is both the accessible name and the tooltip —
 * these are icons over video, so there is nowhere to put visible text.
 */
export function ControlButton({ label, icon, onClick, pressed, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      {...(pressed !== undefined && { 'aria-pressed': pressed })}
      className={`grid h-9 min-w-9 shrink-0 place-items-center rounded-lg px-2 text-paper-50
                  transition-colors hover:bg-white/15 focus-visible:bg-white/15
                  ${pressed ? 'text-ember-300' : ''} ${className}`}
    >
      {icon ? <Icon name={icon} /> : children}
    </button>
  );
}
