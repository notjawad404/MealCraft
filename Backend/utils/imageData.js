/**
 * Vetting for an uploaded recipe photo.
 *
 * Photos arrive as binary multipart, are checked here, and go straight to
 * Cloudinary as bytes — base64 is not involved at any point. It used to be:
 * the image was encoded to a data URI, posted as a JSON field and stored on
 * the recipe document. That cost a third more bytes on the wire for the
 * encoding alone, and put the whole picture inside every read of the recipe.
 *
 * The client downscales and re-encodes before sending, which is where the real
 * size control happens (Frontend/src/lib/image.js). This is the backstop for
 * anything that did not come through the form.
 */
const MAX_IMAGE_BYTES = 1024 * 1024;

// Recipes written before the move to Cloudinary can hold an inline base64
// image up to the old, laxer ceiling. Nothing accepts a new upload that large,
// but scripts/migrateImagesToCloudinary.js still has to be able to read one.
const MAX_LEGACY_IMAGE_BYTES = 2 * 1024 * 1024;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// The declared type comes from the client, so it is checked against the file's
// actual leading bytes. Without this the upload would happily forward any blob
// at all under an `image/png` label.
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
 * Check the bytes of an uploaded image against the type it claims to be.
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

    // Shorter than any real header, so the signature check below would read
    // past the end of the buffer rather than simply failing.
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
