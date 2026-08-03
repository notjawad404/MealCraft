// Recipe images are stored inline on the recipe document as base64 data URIs
// rather than on disk or in object storage, which keeps deployment to a single
// database and nothing else. The trade-off is that every byte counts twice: once
// against MongoDB's 16 MB document ceiling, and again on every read of the
// recipe. Hence the deliberately conservative cap below — the client downscales
// before it ever gets here, so this is a backstop, not the primary limit.
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

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

const formatMb = (bytes) => `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;

const reject = (message) => ({ ok: false, message });

/**
 * Validate a base64 image data URI destined for the `image` field.
 *
 * @param {unknown} value
 * @returns {{ ok: true, bytes: number, mime: string } | { ok: false, message: string }}
 */
function inspectImageDataUrl(value) {
    if (typeof value !== 'string') {
        return reject('Image must be a base64 data URI.');
    }

    // Parsed by hand rather than with one big regex: the payload runs to
    // megabytes, and there is no reason to hand that to the regex engine.
    const comma = value.indexOf(',');
    if (!value.startsWith('data:') || comma === -1) {
        return reject('Image must be a base64 data URI (data:image/…;base64,…).');
    }

    const header = value.slice('data:'.length, comma);
    if (!header.endsWith(';base64')) {
        return reject('Image must be base64-encoded.');
    }

    const mime = header.slice(0, -';base64'.length).toLowerCase();
    if (!ALLOWED_TYPES.includes(mime)) {
        return reject(`Unsupported image type. Use ${ALLOWED_TYPES.join(', ')}.`);
    }

    const payload = value.slice(comma + 1);
    if (!payload || !BASE64_ONLY.test(payload)) {
        return reject('Image data is not valid base64.');
    }

    // Checked before decoding so a hostile payload is never materialised in
    // memory just to be rejected. base64 carries 3 bytes per 4 characters.
    const bytes = Math.floor((payload.length * 3) / 4) - (payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0);
    if (bytes > MAX_IMAGE_BYTES) {
        return reject(`Image is too large (${formatMb(bytes)}). The limit is ${formatMb(MAX_IMAGE_BYTES)}.`);
    }

    const buffer = Buffer.from(payload, 'base64');
    if (buffer.length < 12 || !SIGNATURES[mime](buffer)) {
        return reject(`That does not look like a real ${mime.replace('image/', '')} image.`);
    }

    return { ok: true, bytes: buffer.length, mime };
}

module.exports = { inspectImageDataUrl, MAX_IMAGE_BYTES, ALLOWED_TYPES };
