/**
 * Recognising and embedding recipe video links. Mirrors the API's own parser;
 * see docs/FRONTEND.md.
 */

export const VIDEO_EXTENSIONS = ['.mp4', '.m4v', '.webm', '.ogv', '.mov'];

export const PROVIDER_LABELS = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  dailymotion: 'Dailymotion',
  file: 'Video file',
};

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);
const DAILYMOTION_HOSTS = new Set(['dailymotion.com', 'www.dailymotion.com', 'dai.ly']);

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_ID_IN_PATH = new Set(['shorts', 'embed', 'live', 'v']);
const TIMESTAMP = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/;

const VIMEO_ID = /^\d{6,12}$/;
const VIMEO_HASH = /^[A-Za-z0-9]{6,16}$/;
const DAILYMOTION_ID = /^[a-zA-Z0-9]{5,12}$/;

function startSeconds(url) {
  const raw = (url.searchParams.get('t') ?? url.searchParams.get('start') ?? '').trim();
  const match = raw && TIMESTAMP.exec(raw);
  if (!match) return 0;

  const [, hours, minutes, seconds] = match;
  const total = Number(hours || 0) * 3600 + Number(minutes || 0) * 60 + Number(seconds || 0);
  return total > 0 ? total : 0;
}

function readYoutube(url, segments) {
  const id = url.hostname.toLowerCase().endsWith('youtu.be')
    ? segments[0]
    : segments[0] === 'watch'
      ? url.searchParams.get('v')
      : segments.length >= 2 && YOUTUBE_ID_IN_PATH.has(segments[0])
        ? segments[1]
        : null;

  if (!id || !YOUTUBE_ID.test(id)) return null;
  return { provider: 'youtube', id, hash: '', start: startSeconds(url) };
}

function readVimeo(url, segments) {
  const path = segments[0] === 'video' ? segments.slice(1) : segments;
  const index = path.findIndex((segment) => VIMEO_ID.test(segment));
  if (index === -1) return null;

  const next = path[index + 1];
  const hash = next && VIMEO_HASH.test(next) ? next : url.searchParams.get('h') ?? '';
  return {
    provider: 'vimeo',
    id: path[index],
    hash: VIMEO_HASH.test(hash) ? hash : '',
    start: 0,
  };
}

function readDailymotion(url, segments) {
  const path = segments[0] === 'video' || segments[0] === 'embed' ? segments.slice(1) : segments;
  const id = ((path[0] === 'video' ? path[1] : path[0]) ?? '').split('_')[0];

  return DAILYMOTION_ID.test(id) ? { provider: 'dailymotion', id, hash: '', start: 0 } : null;
}

/**
 * What a link points at, or null if it is not recognisably a video.
 *
 * @returns {{ provider: string, id: string, hash: string, start: number, url: string } | null}
 */
export function parseVideoUrl(value) {
  const raw = (value ?? '').trim();
  if (!raw) return null;

  let url;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split('/').filter(Boolean);

  let parsed = null;
  if (YOUTUBE_HOSTS.has(host)) parsed = readYoutube(url, segments);
  else if (VIMEO_HOSTS.has(host)) parsed = readVimeo(url, segments);
  else if (DAILYMOTION_HOSTS.has(host)) parsed = readDailymotion(url, segments);
  else if (VIDEO_EXTENSIONS.some((suffix) => url.pathname.toLowerCase().endsWith(suffix))) {
    // An http file would be blocked as mixed content.
    parsed = url.protocol === 'https:' ? { provider: 'file', id: '', hash: '', start: 0 } : null;
  }

  return parsed && { ...parsed, url: url.toString() };
}

/** The src for the provider's own player. */
export function embedSrc(parsed) {
  const { provider, id, hash, start } = parsed;

  if (provider === 'youtube') {
    const params = new URLSearchParams({ autoplay: '1', rel: '0', playsinline: '1' });
    if (start) params.set('start', String(start));
    return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
  }

  if (provider === 'vimeo') {
    const params = new URLSearchParams({ autoplay: '1', title: '0', byline: '0', portrait: '0' });
    if (hash) params.set('h', hash);
    return `https://player.vimeo.com/video/${id}?${params}`;
  }

  if (provider === 'dailymotion') {
    return `https://www.dailymotion.com/embed/video/${id}?autoplay=1`;
  }

  return null;
}

/** 372 → "6:12". */
export function formatClock(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';

  const whole = Math.floor(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const rest = whole % 60;

  const pad = (value) => String(value).padStart(2, '0');
  return hours ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${minutes}:${pad(rest)}`;
}
