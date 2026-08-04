const { v2: cloudinary } = require('cloudinary');

// Resolved on first use rather than at require time. index.js calls
// dotenv.config() after its own requires have already run, and on Vercel the
// values are injected by the platform — reading them lazily means neither
// order can leave this module half-configured.
let resolved = null;

/**
 * Credentials are accepted in either of the two forms Cloudinary hands out:
 *
 *   CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
 *
 * or the three parts spelled out separately, which reads better in a .env:
 *
 *   CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
 *
 * The SDK picks CLOUDINARY_URL up on its own the first time config() is
 * touched, so that branch only has to confirm the parse produced something.
 */
function resolveConfig() {
    if (resolved) return resolved;

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    // Merged, not replaced: passing only `secure` leaves anything the SDK
    // already read out of CLOUDINARY_URL intact.
    cloudinary.config({
        secure: true,
        // Otherwise every generated URL carries a `?_a=` tracking token
        // identifying the SDK build. These URLs are written to the database and
        // kept for the life of the recipe, so that token would outlive the
        // version it describes and split the CDN cache on upgrade.
        analytics: false,
        ...(cloudName ? { cloud_name: cloudName } : {}),
        ...(apiKey ? { api_key: apiKey } : {}),
        ...(apiSecret ? { api_secret: apiSecret } : {}),
    });

    const active = cloudinary.config();
    const enabled = Boolean(active.cloud_name && active.api_key && active.api_secret);

    if (!enabled) {
        // Not fatal. Without credentials the app keeps storing images inline on
        // the recipe document exactly as it did before, so a checkout with no
        // Cloudinary account still runs — it just carries the old trade-offs.
        console.warn(
            'Cloudinary is not configured — recipe images will be stored inline as base64.\n' +
            'Set CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET (or CLOUDINARY_URL) in Backend/.env.',
        );
    }

    resolved = { enabled, cloudName: active.cloud_name || '' };
    return resolved;
}

/**
 * The SDK client, guaranteed to have been configured first.
 *
 * Exported in place of the raw `cloudinary` object on purpose. Because
 * config() is what applies the credentials, reaching for the client directly
 * works or fails depending on whether something else happened to have called
 * in first — which is the kind of ordering bug that only shows up in the one
 * code path nobody exercised.
 */
function getCloudinary() {
    resolveConfig();
    return cloudinary;
}

/** True once a usable cloud name, key and secret are all present. */
const isCloudinaryEnabled = () => resolveConfig().enabled;

/** The configured cloud, used to tell our own delivery URLs from anyone else's. */
const getCloudName = () => resolveConfig().cloudName;

/** Where uploads land. Overridable so staging and production can stay apart. */
const getUploadFolder = () => process.env.CLOUDINARY_FOLDER || 'mealcraft/recipes';

module.exports = { getCloudinary, isCloudinaryEnabled, getCloudName, getUploadFolder };
