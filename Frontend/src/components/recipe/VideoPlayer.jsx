import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PROVIDER_LABELS, embedSrc, parseVideoUrl } from '../../lib/video';
import FileVideo from './FileVideo';
import { ControlButton, Icon } from './videoControls';

const fullscreenElement = () => document.fullscreenElement ?? document.webkitFullscreenElement ?? null;

/**
 * A recipe's video, however it was linked.
 *
 * There are two players behind this, deliberately:
 *
 *   - A provider link is shown in that provider's own embedded player. Quality,
 *     captions, chapters and playback speed are all things YouTube and Vimeo do
 *     properly, in a document this page cannot reach into; replacing their
 *     controls with ours would mean giving those up, not gaining them.
 *   - A direct file has no such player, so FileVideo supplies one.
 *
 * Either way this component owns the frame around it: full screen, and theatre
 * mode when the surrounding page offers one.
 */
export default function VideoPlayer({ url, title, theater = false, onToggleTheater }) {
  const parsed = useMemo(() => parseVideoUrl(url), [url]);
  const shellRef = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);

  // Tracked by event rather than by our own click: leaving full screen with the
  // escape key never goes through the button, and the icon has to follow.
  useEffect(() => {
    const onChange = () => setFullscreen(fullscreenElement() === shellRef.current);
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    const shell = shellRef.current;
    if (!shell) return;

    if (fullscreenElement()) {
      (document.exitFullscreen ?? document.webkitExitFullscreen)?.call(document);
    } else {
      (shell.requestFullscreen ?? shell.webkitRequestFullscreen)?.call(shell);
    }
  }, []);

  if (!parsed) {
    // Only reachable for a link stored before this parser knew about it.
    return (
      <div className="grid aspect-video w-full place-items-center rounded-2xl bg-night-900 px-6 text-center">
        <div>
          <p className="text-[15px] font-semibold text-paper-50">This video cannot be played here.</p>
          <a
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/25 px-4 py-2 text-xs font-semibold text-paper-50 transition-colors hover:bg-white/10"
          >
            <Icon name="external" className="h-3.5 w-3.5" />
            Open the link
          </a>
        </div>
      </div>
    );
  }

  const frameClass = fullscreen ? 'min-h-0 flex-1' : 'aspect-video';

  return (
    <div
      ref={shellRef}
      className={`flex w-full flex-col overflow-hidden bg-night-900 ${fullscreen ? 'h-full rounded-none' : 'rounded-2xl'}`}
    >
      {parsed.provider === 'file' ? (
        <div className={frameClass}>
          <FileVideo
            src={parsed.url}
            title={title}
            theater={theater}
            onToggleTheater={onToggleTheater}
            fullscreen={fullscreen}
            onToggleFullscreen={toggleFullscreen}
          />
        </div>
      ) : (
        <>
          <div className={frameClass}>
            <iframe
              src={embedSrc(parsed)}
              title={title}
              className="h-full w-full border-0"
              // Everything the embedded players need; without `fullscreen`
              // their own expand button is greyed out inside the frame.
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>

          {/* Sits under the frame rather than over it: the provider's own
              controls are along the bottom edge inside, and covering those is
              exactly the wrong trade. */}
          <div className="flex items-center gap-0.5 px-2 py-1">
            <span className="px-2 text-[11px] font-semibold uppercase tracking-widest text-ink-400">
              {PROVIDER_LABELS[parsed.provider]}
            </span>

            <div className="flex-1" />

            <ControlButton label={`Open on ${PROVIDER_LABELS[parsed.provider]}`} onClick={() => window.open(parsed.url, '_blank', 'noopener,noreferrer')} icon="external" />

            {onToggleTheater && (
              <ControlButton
                label={theater ? 'Exit theatre mode' : 'Theatre mode'}
                icon={theater ? 'compact' : 'theater'}
                onClick={onToggleTheater}
                pressed={theater}
              />
            )}

            <ControlButton
              label={fullscreen ? 'Exit full screen' : 'Full screen'}
              icon={fullscreen ? 'shrink' : 'expand'}
              onClick={toggleFullscreen}
            />
          </div>
        </>
      )}
    </div>
  );
}
