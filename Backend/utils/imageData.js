// Recipe images are stored inline on the recipe document as base64 data URIs
// rather than on disk or in object storage, which keeps deployment to a single
// database and nothing else. The trade-off is that every byte counts twice: once
// against MongoDB's 16 MB document ceiling, and again on every read of the
// recipe. Hence the deliberately conservative cap below — the client downscales
// before it ever gets here, so this is a backstop, not the primary limit.
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

// Listings return the thumbnail instead of the full image — twenty full-size
// photos a page is not something anyone wants to download. Keeping the ceiling
// this low is what makes that trade worthwhile.
const MAX_THUMBNAIL_BYTES = 192 * 1024;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const BASE64_ONLY = /^[A-Za-z0-9+/]+={0,2}$/;

// The declared MIME type comes from the client, so it is checked against the
// file's actual leading bytes. Without this the field would happily store any
// blob at all under an `image/png` label.
const SIGNATURES = {
    'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
    'image/png': (b) =>
        b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    'image/gif': (b) => b.subarray(0, 4).toString('latin1') === 'GIF8',
    'image/webp': (b) =>
        b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
};

// Thumbnails are capped well under a megabyte, so rounding everything to MB
// produces messages like "too large (0.2 MB), the limit is 0.2 MB".
const formatSize = (bytes) =>
    bytes < 1024 * 1024
        ? `${Math.round(bytes / 1024)} KB`
        : `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;

const reject = (message) => ({ ok: false, message });

/**
 * Validate a base64 image data URI destined for the `image` or `thumbnail` field.
 *
 * @param {unknown} value
 * @param {{ maxBytes?: number, label?: string }} [options]
 * @returns {{ ok: true, bytes: number, mime: string } | { ok: false, message: string }}
 */
function inspectImageDataUrl(value, { maxBytes = MAX_IMAGE_BYTES, label = 'Image' } = {}) {
    if (typeof value !== 'string') {
        return reject(`${label} must be a base64 data URI.`);
    }

    // Parsed by hand rather than with one big regex: the payload runs to
    // megabytes, and there is no reason to hand that to the regex engine.
    const comma = value.indexOf(',');
    if (!value.startsWith('data:') || comma === -1) {
        return reject(`${label} must be a base64 data URI (data:image/…;base64,…).`);
    }

    const header = value.slice('data:'.length, comma);
    if (!header.endsWith(';base64')) {
        return reject(`${label} must be base64-encoded.`);
    }

    const mime = header.slice(0, -';base64'.length).toLowerCase();
    if (!ALLOWED_TYPES.includes(mime)) {
        return reject(`Unsupported image type. Use ${ALLOWED_TYPES.join(', ')}.`);
    }

    const payload = value.slice(comma + 1);
    if (!payload || !BASE64_ONLY.test(payload)) {
        return reject(`${label} data is not valid base64.`);
    }

    // Checked before decoding so a hostile payload is never materialised in
    // memory just to be rejected. base64 carries 3 bytes per 4 characters.
    const bytes = Math.floor((payload.length * 3) / 4) - (payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0);
    if (bytes > maxBytes) {
        return reject(`${label} is too large (${formatSize(bytes)}). The limit is ${formatSize(maxBytes)}.`);
    }

    const buffer = Buffer.from(payload, 'base64');
    if (buffer.length < 12 || !SIGNATURES[mime](buffer)) {
        return reject(`That does not look like a real ${mime.replace('image/', '')} image.`);
    }

    return { ok: true, bytes: buffer.length, mime };
}

module.exports = { inspectImageDataUrl, MAX_IMAGE_BYTES, MAX_THUMBNAIL_BYTES, ALLOWED_TYPES };
