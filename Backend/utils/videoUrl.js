// The recipe's optional video link. See docs/BACKEND.md.

const MAX_URL_LENGTH = 500;
const MAX_START_SECONDS = 24 * 60 * 60;

// Playable from a plain <video> element. Streaming manifests are excluded.
const VIDEO_EXTENSIONS = ['.mp4', '.m4v', '.webm', '.ogv', '.mov'];

const reject = (message) => ({ ok: false, message });

/* ---- YouTube ------------------------------------------------------------ */

const YOUTUBE_HOSTS = new Set([
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'music.youtube.com',
    'youtu.be',
    'www.youtu.be',
]);

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

// Paths carrying the id as their second segment: /shorts/ID, /embed/ID, …
const YOUTUBE_ID_IN_PATH = new Set(['shorts', 'embed', 'live', 'v']);

// Plain seconds ("90", "90s") or YouTube shorthand ("1h2m3s").
const TIMESTAMP = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/;

function youtubeStart(url) {
    const raw = (url.searchParams.get('t') ?? url.searchParams.get('start') ?? '').trim();
    if (!raw) return 0;

    const match = TIMESTAMP.exec(raw);
    if (!match) return 0;

    const [, hours, minutes, seconds] = match;
    const total = Number(hours || 0) * 3600 + Number(minutes || 0) * 60 + Number(seconds || 0);
    return total > 0 && total <= MAX_START_SECONDS ? total : 0;
}

function readYoutube(url, segments) {
    const id = url.hostname.toLowerCase().endsWith('youtu.be')
        ? segments[0]
        : segments[0] === 'watch'
            ? url.searchParams.get('v')
            : segments.length >= 2 && YOUTUBE_ID_IN_PATH.has(segments[0])
                ? segments[1]
                : null;

    if (!id || !YOUTUBE_ID.test(id)) {
        return reject('That YouTube link does not point at a video.');
    }

    const start = youtubeStart(url);
    return {
        ok: true,
        provider: 'youtube',
        videoId: id,
        url: `https://www.youtube.com/watch?v=${id}${start ? `&t=${start}s` : ''}`,
    };
}

/* ---- Vimeo -------------------------------------------------------------- */

const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);

const VIMEO_ID = /^\d{6,12}$/;
// Privacy hash carried by unlisted videos.
const VIMEO_HASH = /^[A-Za-z0-9]{6,16}$/;

function readVimeo(url, segments) {
    const path = segments[0] === 'video' ? segments.slice(1) : segments;
    // /channels/staffpicks/12345678 puts the id last, not first.
    const index = path.findIndex((segment) => VIMEO_ID.test(segment));
    if (index === -1) {
        return reject('That Vimeo link does not point at a video.');
    }

    const id = path[index];
    const next = path[index + 1];
    const hash = next && VIMEO_HASH.test(next) ? next : url.searchParams.get('h');
    const suffix = hash && VIMEO_HASH.test(hash) ? `/${hash}` : '';

    return { ok: true, provider: 'vimeo', videoId: id + suffix, url: `https://vimeo.com/${id}${suffix}` };
}

/* ---- Dailymotion -------------------------------------------------------- */

const DAILYMOTION_HOSTS = new Set(['dailymotion.com', 'www.dailymotion.com', 'dai.ly']);

const DAILYMOTION_ID = /^[a-zA-Z0-9]{5,12}$/;

function readDailymotion(url, segments) {
    const path = segments[0] === 'video' || segments[0] === 'embed' ? segments.slice(1) : segments;
    // Share links append a title slug: x8abcde_lemon-roast-chicken.
    const raw = (path[0] === 'video' ? path[1] : path[0]) ?? '';
    const id = raw.split('_')[0];

    if (!DAILYMOTION_ID.test(id)) {
        return reject('That Dailymotion link does not point at a video.');
    }

    return { ok: true, provider: 'dailymotion', videoId: id, url: `https://www.dailymotion.com/video/${id}` };
}

/* ---- Direct files ------------------------------------------------------- */

function readFile(url) {
    const path = url.pathname.toLowerCase();
    const extension = VIDEO_EXTENSIONS.find((suffix) => path.endsWith(suffix));

    if (!extension) {
        return reject(
            'That link does not look like a video. Paste a YouTube, Vimeo or Dailymotion link, ' +
            `or a direct link to a video file (${VIDEO_EXTENSIONS.join(', ')}).`,
        );
    }

    // An http video would be blocked as mixed content.
    if (url.protocol !== 'https:') {
        return reject('A direct video link has to be https, or browsers will refuse to play it.');
    }

    // Kept whole: there is no id to rebuild the URL from.
    return { ok: true, provider: 'file', videoId: null, url: url.toString() };
}

/**
 * Validate a pasted video link and rebuild it in canonical form.
 *
 * @param {unknown} value
 * @returns {{ ok: true, url: string, provider: string, videoId: string | null }
 *          | { ok: false, message: string }}
 */
function normalizeVideoUrl(value) {
    if (typeof value !== 'string') {
        return reject('The video link must be text.');
    }

    const raw = value.trim();
    if (raw.length > MAX_URL_LENGTH) {
        return reject('That link is too long.');
    }

    let url;
    try {
        // A missing scheme is assumed to be https.
        url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
    } catch {
        return reject('That does not look like a link.');
    }

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        return reject('The video link must be an http or https address.');
    }

    const host = url.hostname.toLowerCase();
    const segments = url.pathname.split('/').filter(Boolean);

    if (YOUTUBE_HOSTS.has(host)) return readYoutube(url, segments);
    if (VIMEO_HOSTS.has(host)) return readVimeo(url, segments);
    if (DAILYMOTION_HOSTS.has(host)) return readDailymotion(url, segments);

    return readFile(url);
}

module.exports = { normalizeVideoUrl, MAX_URL_LENGTH, VIDEO_EXTENSIONS };
