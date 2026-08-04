import { useCallback, useEffect, useRef, useState } from 'react';
import { formatClock } from '../../lib/video';
import { ControlButton, Icon } from './videoControls';

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
const SKIP_SECONDS = 10;
const HIDE_CONTROLS_AFTER = 2600;

const clamp = (value, max) => Math.min(Math.max(value, 0), max || 0);
const percent = (value, total) => (total > 0 ? `${(value / total) * 100}%` : '0%');

/**
 * A direct video file, played through <video> with our own controls. The element
 * is the source of truth; the state below mirrors it. See docs/FRONTEND.md.
 */
export default function FileVideo({ src, title, theater, onToggleTheater, fullscreen, onToggleFullscreen }) {
  const videoRef = useRef(null);
  const hideTimer = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [captions, setCaptions] = useState([]);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [idle, setIdle] = useState(false);

  const controlsShown = !idle || !playing || speedOpen;

  const wake = useCallback(() => {
    setIdle(false);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setIdle(true), HIDE_CONTROLS_AFTER);
  }, []);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  /* ---- Actions: all write to the element, never to state ---- */

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) video.play().catch(() => setFailed(true));
    else video.pause();
  }, []);

  const skip = useCallback((delta) => {
    const video = videoRef.current;
    if (video) video.currentTime = clamp(video.currentTime + delta, video.duration);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) video.muted = !video.muted;
  }, []);

  const changeVolume = (next) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = next;
    video.muted = next === 0;
  };

  const changeRate = (next) => {
    const video = videoRef.current;
    if (video) video.playbackRate = next;
    setSpeedOpen(false);
  };

  const toggleCaptions = () => {
    const next = !captionsOn;
    captions.forEach((track, index) => {
      track.mode = next && index === 0 ? 'showing' : 'disabled';
    });
    setCaptionsOn(next);
  };

  /* ---- Keyboard ---- */

  useEffect(() => {
    const onKeyDown = (event) => {
      // Focusable elements keep their own keys.
      if (event.target.closest?.('input, textarea, select, button, a, [contenteditable]')) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const actions = {
        ' ': togglePlay,
        k: togglePlay,
        ArrowLeft: () => skip(-5),
        ArrowRight: () => skip(5),
        j: () => skip(-SKIP_SECONDS),
        l: () => skip(SKIP_SECONDS),
        m: toggleMute,
        f: onToggleFullscreen,
        t: onToggleTheater,
      };

      const action = actions[event.key.length === 1 ? event.key.toLowerCase() : event.key];
      if (!action) return;

      event.preventDefault();
      wake();
      action();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [togglePlay, skip, toggleMute, onToggleFullscreen, onToggleTheater, wake]);

  /* ---- Mirroring the element ---- */

  const readBuffered = (video) => {
    const ranges = video.buffered;
    setBuffered(ranges.length ? ranges.end(ranges.length - 1) : 0);
  };

  const onLoadedMetadata = (event) => {
    const video = event.currentTarget;
    setDuration(Number.isFinite(video.duration) ? video.duration : 0);

    // Subtitles shipped inside the file, if any; the button hides without them.
    const tracks = Array.from(video.textTracks).filter(
      (track) => track.kind === 'subtitles' || track.kind === 'captions',
    );
    tracks.forEach((track) => {
      track.mode = 'disabled';
    });
    setCaptions(tracks);
  };

  if (failed) {
    return (
      <div className="grid h-full w-full place-items-center bg-night-900 px-6 text-center">
        <div>
          <p className="text-[15px] font-semibold text-paper-50">This video would not play.</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-300">
            The file may have moved, or be in a format this browser cannot read.
          </p>
          <a
            href={src}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/25 px-4 py-2 text-xs font-semibold text-paper-50 transition-colors hover:bg-white/10"
          >
            <Icon name="external" className="h-3.5 w-3.5" />
            Open the file directly
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative h-full w-full bg-night-900 ${controlsShown ? '' : 'cursor-none'}`}
      onMouseMove={wake}
      onTouchStart={wake}
      onMouseLeave={() => playing && setIdle(true)}
    >
      <video
        ref={videoRef}
        src={src}
        title={title}
        playsInline
        preload="metadata"
        tabIndex={0}
        className="h-full w-full bg-night-900 focus:outline-none"
        onClick={togglePlay}
        onDoubleClick={onToggleFullscreen}
        onLoadedMetadata={onLoadedMetadata}
        onDurationChange={(e) => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onProgress={(e) => readBuffered(e.currentTarget)}
        onPlay={() => { setPlaying(true); setEnded(false); wake(); }}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setEnded(true); }}
        onWaiting={() => setWaiting(true)}
        onPlaying={() => setWaiting(false)}
        onRateChange={(e) => setRate(e.currentTarget.playbackRate)}
        onVolumeChange={(e) => { setVolume(e.currentTarget.volume); setMuted(e.currentTarget.muted); }}
        onError={() => setFailed(true)}
      />

      {waiting && playing && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/25 border-t-paper-50" />
        </div>
      )}

      {/* The big play target, for a video that is not running. */}
      {!playing && !waiting && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label={ended ? 'Play again' : 'Play'}
          className="absolute inset-0 grid place-items-center bg-night-900/20 transition-colors hover:bg-night-900/30"
        >
          <span className="grid h-16 w-16 place-items-center rounded-full bg-ember-600/95 text-paper-50 shadow-lift transition-transform hover:scale-105">
            <Icon name={ended ? 'replay' : 'play'} className="ml-0.5 h-7 w-7" />
          </span>
        </button>
      )}

      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-night-900/95 via-night-900/70 to-transparent
                    px-3 pb-2 pt-8 transition-opacity duration-200
                    ${controlsShown ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="any"
          value={Math.min(time, duration || 0)}
          onChange={(e) => {
            const video = videoRef.current;
            if (video) video.currentTime = Number(e.target.value);
          }}
          aria-label="Seek"
          aria-valuetext={`${formatClock(time)} of ${formatClock(duration)}`}
          className="video-range"
          style={{ '--played': percent(time, duration), '--buffered': percent(buffered, duration) }}
        />

        <div className="mt-1 flex items-center gap-0.5">
          <ControlButton label={playing ? 'Pause' : 'Play'} icon={playing ? 'pause' : ended ? 'replay' : 'play'} onClick={togglePlay} />
          <ControlButton label={`Back ${SKIP_SECONDS} seconds`} icon="back" onClick={() => skip(-SKIP_SECONDS)} />
          <ControlButton label={`Forward ${SKIP_SECONDS} seconds`} icon="forward" onClick={() => skip(SKIP_SECONDS)} />

          {/* Slides out on hover or focus; never removed from the tab order. */}
          <div className="group flex items-center">
            <ControlButton label={muted ? 'Unmute' : 'Mute'} icon={muted || volume === 0 ? 'muted' : 'volume'} onClick={toggleMute} />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={muted ? 0 : volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              aria-label="Volume"
              className="video-range w-0 opacity-0 transition-all duration-200 group-hover:mr-2 group-hover:w-20
                         group-hover:opacity-100 focus:mr-2 focus:w-20 focus:opacity-100"
              style={{ '--played': `${(muted ? 0 : volume) * 100}%`, '--buffered': '0%' }}
            />
          </div>

          <span className="ml-2 select-none text-xs font-medium tabular-nums text-paper-50/90">
            {formatClock(time)} <span className="text-paper-50/50">/ {formatClock(duration)}</span>
          </span>

          <div className="flex-1" />

          <div className="relative">
            <ControlButton
              label="Playback speed"
              onClick={() => setSpeedOpen((open) => !open)}
              pressed={rate !== 1}
            >
              <span className="px-1 text-xs font-semibold tabular-nums">{rate}×</span>
            </ControlButton>

            {speedOpen && (
              <ul className="absolute bottom-11 right-0 min-w-[6rem] overflow-hidden rounded-xl border border-white/15 bg-night-900/95 py-1 shadow-lift backdrop-blur">
                {RATES.map((option) => (
                  <li key={option}>
                    <button
                      type="button"
                      onClick={() => changeRate(option)}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-1.5 text-xs font-medium
                                  transition-colors hover:bg-white/10
                                  ${option === rate ? 'text-ember-300' : 'text-paper-50'}`}
                    >
                      {option === 1 ? 'Normal' : `${option}×`}
                      {option === rate && <Icon name="play" className="h-2.5 w-2.5" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {captions.length > 0 && (
            <ControlButton
              label={captionsOn ? 'Turn off captions' : 'Turn on captions'}
              icon="captions"
              onClick={toggleCaptions}
              pressed={captionsOn}
            />
          )}

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
            onClick={onToggleFullscreen}
          />
        </div>
      </div>
    </div>
  );
}
