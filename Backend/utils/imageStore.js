const { getCloudinary, isCloudinaryEnabled, getCloudName, getUploadFolder } = require('../config/cloudinary');

/**
 * Where recipe photos live.
 *
 * The browser downscales and re-encodes a picked file, then posts the result as
 * a binary multipart part. Those bytes are streamed straight to Cloudinary and
 * only two short delivery URLs are written to MongoDB, so a recipe document is
 * a few kilobytes of text however large the photo was.
 *
 * Nothing here is base64. The image is never encoded to a data URI on the way
 * in, never stored as one, and never returned as one — an encoding step that
 * used to inflate every upload by a third for no benefit to anybody.
 */

// Delivered rather than stored: the master upload is kept as it arrived, and
// these run at request time on Cloudinary's CDN. `q_auto` and `f_auto` are what
// pay for the migration — a browser that takes AVIF gets AVIF.
const FULL_TRANSFORM = { width: 1600, crop: 'limit', quality: 'auto', fetch_format: 'auto' };

// Cards draw this at 176px tall and object-cover it, so a fixed 4:3 fill is
// safe. `g_auto` keeps the interesting part of the plate in frame instead of
// cropping to the geometric centre.
const THUMB_TRANSFORM = {
    width: 400,
    height: 300,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto',
    fetch_format: 'auto',
};

// A slow upload must not sit there burning a serverless invocation's whole
// budget; failing at 20s leaves room to answer the request properly.
const UPLOAD_TIMEOUT_MS = 20000;

/** Errors worth showing the user verbatim, as opposed to a stack trace. */
class ImageStoreError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ImageStoreError';
    }
}

/**
 * True for a delivery URL on *our* cloud.
 *
 * An edit resubmits whatever the form was seeded with, so the image field
 * routinely arrives as a URL this app wrote on an earlier request. That has to
 * be allowed through untouched — but only if it really is ours, or the field
 * would become somewhere to park an arbitrary link.
 */
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
 * Send one image's bytes to Cloudinary and return the pair of URLs the recipe
 * document carries, plus the id needed to delete the asset later.
 *
 * The caller is expected to have run utils/imageData.js over the buffer first:
 * type, size and magic bytes are settled before anything leaves this machine,
 * so Cloudinary is never asked to arbitrate what counts as an image.
 *
 * @param {Buffer} buffer  the raw file, exactly as uploaded
 * @returns {Promise<{ image: string, thumbnail: string, publicId: string, bytes: number }>}
 */
async function uploadImage(buffer) {
    const cloudinary = getCloudinary();

    // Caught here rather than left to fail as "Must supply api_key" from deep
    // inside the SDK: a caller that skipped isCloudinaryEnabled() should be
    // told what it actually did wrong.
    if (!isCloudinaryEnabled()) {
        throw new ImageStoreError('Image uploads are not configured on this server.');
    }

    const options = {
        folder: getUploadFolder(),
        resource_type: 'image',
        // Never land on top of an existing asset: two cooks uploading
        // "IMG_0042.jpg" must not become one cook's photo twice.
        unique_filename: true,
        overwrite: false,
        timeout: UPLOAD_TIMEOUT_MS,
    };

    let uploaded;
    try {
        // upload_stream rather than upload(): the latter wants a path or a data
        // URI, and handing it a data URI would mean base64-encoding a buffer we
        // are already holding just to have the SDK decode it again.
        uploaded = await new Promise((resolve, rejectUpload) => {
            const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
                if (err) rejectUpload(err);
                else resolve(result);
            });
            stream.end(buffer);
        });
    } catch (err) {
        // The SDK reports HTTP failures as `{ http_code, message }` rather than
        // as an Error, so `err.message` alone is often undefined.
        const detail = err?.message || err?.error?.message || 'unknown error';
        console.error(`Cloudinary upload failed: ${detail}`);
        throw new ImageStoreError('The photo could not be uploaded. Please try again.');
    }

    const derive = (transform) =>
        cloudinary.url(uploaded.public_id, {
            secure: true,
            // Pinning the version makes each URL immutable, so a CDN or browser
            // can cache it forever without ever serving a stale photo.
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

/**
 * Remove an asset that nothing points at any more — a replaced photo, or one
 * belonging to a deleted recipe.
 *
 * Deliberately never throws. The document write has already happened by the
 * time this runs, and failing the request afterwards would tell the user their
 * edit did not save when it did. A leaked asset is the cheaper mistake, and it
 * is logged so it can be swept up.
 */
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
