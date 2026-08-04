const { getCloudinary, isCloudinaryEnabled, getCloudName, getUploadFolder } = require('../config/cloudinary');

/** Cloudinary-backed storage for recipe photos. See docs/BACKEND.md. */

// Delivery transforms, applied at request time rather than on upload.
const FULL_TRANSFORM = { width: 1600, crop: 'limit', quality: 'auto', fetch_format: 'auto' };

const THUMB_TRANSFORM = {
    width: 400,
    height: 300,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto',
    fetch_format: 'auto',
};

const UPLOAD_TIMEOUT_MS = 20000;

/** Errors whose message is safe to show the user verbatim. */
class ImageStoreError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ImageStoreError';
    }
}

/** True for a delivery URL on our own cloud. */
function isStoredImageUrl(value) {
    if (typeof value !== 'string' || !value.startsWith('https://')) return false;

    const cloudName = getCloudName();
    if (!cloudName) return false;

    try {
        const url = new URL(value);
        return url.hostname === 'res.cloudinary.com' && url.pathname.startsWith(`/${cloudName}/`);
    } catch {
        return false;
    }
}

/**
 * Upload one image's bytes. Callers must vet the buffer first with
 * utils/imageData.js.
 *
 * @param {Buffer} buffer  the raw file, exactly as uploaded
 * @returns {Promise<{ image: string, thumbnail: string, publicId: string, bytes: number }>}
 */
async function uploadImage(buffer) {
    const cloudinary = getCloudinary();

    if (!isCloudinaryEnabled()) {
        throw new ImageStoreError('Image uploads are not configured on this server.');
    }

    const options = {
        folder: getUploadFolder(),
        resource_type: 'image',
        unique_filename: true,
        overwrite: false,
        timeout: UPLOAD_TIMEOUT_MS,
    };

    let uploaded;
    try {
        uploaded = await new Promise((resolve, rejectUpload) => {
            const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
                if (err) rejectUpload(err);
                else resolve(result);
            });
            stream.end(buffer);
        });
    } catch (err) {
        const detail = err?.message || err?.error?.message || 'unknown error';
        console.error(`Cloudinary upload failed: ${detail}`);
        throw new ImageStoreError('The photo could not be uploaded. Please try again.');
    }

    const derive = (transform) =>
        cloudinary.url(uploaded.public_id, {
            secure: true,
            // Pinned so each URL is immutable and safe to cache indefinitely.
            version: uploaded.version,
            transformation: [transform],
        });

    return {
        image: derive(FULL_TRANSFORM),
        thumbnail: derive(THUMB_TRANSFORM),
        publicId: uploaded.public_id,
        bytes: uploaded.bytes,
    };
}

/** Remove an orphaned asset. Never throws; failures are logged. */
async function destroyImage(publicId) {
    if (!publicId || !isCloudinaryEnabled()) return;

    try {
        await getCloudinary().uploader.destroy(publicId, { invalidate: true, timeout: UPLOAD_TIMEOUT_MS });
    } catch (err) {
        console.error(`Cloudinary delete failed for ${publicId}: ${err?.message || err}`);
    }
}

module.exports = {
    ImageStoreError,
    isCloudinaryEnabled,
    isStoredImageUrl,
    uploadImage,
    destroyImage,
};
