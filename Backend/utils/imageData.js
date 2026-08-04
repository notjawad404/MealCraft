/** Vetting for an uploaded recipe photo. See docs/BACKEND.md. */
const MAX_IMAGE_BYTES = 1024 * 1024;

// Ceiling for legacy inline images, read only by the migration script.
const MAX_LEGACY_IMAGE_BYTES = 2 * 1024 * 1024;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Leading bytes per type, checked against the client's declared type.
const SIGNATURES = {
    'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
    'image/png': (b) =>
        b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    'image/gif': (b) => b.subarray(0, 4).toString('latin1') === 'GIF8',
    'image/webp': (b) =>
        b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
};

const formatSize = (bytes) =>
    bytes < 1024 * 1024
        ? `${Math.round(bytes / 1024)} KB`
        : `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;

const reject = (message) => ({ ok: false, message });

/**
 * Check an uploaded image's bytes against the type it claims to be.
 *
 * @param {Buffer} buffer
 * @param {string} declaredType  the multipart part's Content-Type
 * @param {{ maxBytes?: number }} [options]
 * @returns {{ ok: true, bytes: number, mime: string } | { ok: false, message: string }}
 */
function inspectImageBuffer(buffer, declaredType, { maxBytes = MAX_IMAGE_BYTES } = {}) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        return reject('No image data was received.');
    }

    const mime = String(declaredType || '').toLowerCase();
    if (!ALLOWED_TYPES.includes(mime)) {
        return reject(`Unsupported image type. Use ${ALLOWED_TYPES.join(', ')}.`);
    }

    if (buffer.length > maxBytes) {
        return reject(`Image is too large (${formatSize(buffer.length)}). The limit is ${formatSize(maxBytes)}.`);
    }

    // Shorter than any real header, so the signature check cannot run.
    if (buffer.length < 12 || !SIGNATURES[mime](buffer)) {
        return reject(`That does not look like a real ${mime.replace('image/', '')} image.`);
    }

    return { ok: true, bytes: buffer.length, mime };
}

module.exports = {
    inspectImageBuffer,
    formatSize,
    MAX_IMAGE_BYTES,
    MAX_LEGACY_IMAGE_BYTES,
    ALLOWED_TYPES,
};
