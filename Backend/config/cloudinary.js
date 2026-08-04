const { v2: cloudinary } = require('cloudinary');

// Resolved on first use, not at require time.
let resolved = null;

/** Accepts CLOUDINARY_URL or the three parts spelled out separately. */
function resolveConfig() {
    if (resolved) return resolved;

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    // Merged, so anything read from CLOUDINARY_URL survives.
    cloudinary.config({
        secure: true,
        // Keeps the SDK's `?_a=` token out of the stored URLs.
        analytics: false,
        ...(cloudName ? { cloud_name: cloudName } : {}),
        ...(apiKey ? { api_key: apiKey } : {}),
        ...(apiSecret ? { api_secret: apiSecret } : {}),
    });

    const active = cloudinary.config();
    const enabled = Boolean(active.cloud_name && active.api_key && active.api_secret);

    if (!enabled) {
        // Not fatal: images fall back to being stored inline.
        console.warn(
            'Cloudinary is not configured — recipe images will be stored inline as base64.\n' +
            'Set CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET (or CLOUDINARY_URL) in Backend/.env.',
        );
    }

    resolved = { enabled, cloudName: active.cloud_name || '' };
    return resolved;
}

/** The SDK client, guaranteed to have been configured first. */
function getCloudinary() {
    resolveConfig();
    return cloudinary;
}

/** True once a usable cloud name, key and secret are all present. */
const isCloudinaryEnabled = () => resolveConfig().enabled;

/** The configured cloud, used to recognise our own delivery URLs. */
const getCloudName = () => resolveConfig().cloudName;

/** Where uploads land. Overridable per environment. */
const getUploadFolder = () => process.env.CLOUDINARY_FOLDER || 'mealcraft/recipes';

module.exports = { getCloudinary, isCloudinaryEnabled, getCloudName, getUploadFolder };
