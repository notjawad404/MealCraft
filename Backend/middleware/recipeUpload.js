const multer = require('multer');
const { MAX_IMAGE_BYTES, ALLOWED_TYPES, formatSize } = require('../utils/imageData');

/**
 * Accepts the two shapes a recipe write can arrive in.
 *
 * With a photo it is `multipart/form-data`: one binary `image` part, and a
 * `payload` part holding the rest of the recipe as JSON. Splitting it that way
 * means the controller and every normalizer behind it keep working on an
 * ordinary object — multipart on its own would flatten the nutrient rows and
 * the tag lists into strings.
 *
 * Without a photo it stays plain JSON, which is what the visibility toggle and
 * any edit that does not touch the picture send. multer ignores a request that
 * is not multipart, so both paths run through the same route.
 */
const upload = multer({
    // Held in memory rather than spooled to a file: the buffer goes straight to
    // Cloudinary and is never needed again, and a serverless filesystem is
    // read-only in any case.
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_IMAGE_BYTES,
        files: 1,
        // Only `payload` is expected; the ceiling is for the recipe text, which
        // is generous at half a megabyte even for a long method.
        fields: 4,
        fieldSize: 512 * 1024,
    },
    fileFilter(req, file, cb) {
        // A cheap first pass on the declared type. The bytes themselves are
        // checked in the controller, which is what actually settles it.
        if (!ALLOWED_TYPES.includes(String(file.mimetype).toLowerCase())) {
            cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'image'));
            return;
        }
        cb(null, true);
    },
}).single('image');

// multer's own errors are terse and carry no HTTP status, so they are turned
// into the same `{ message }` shape every other failed write answers with.
const MESSAGES = {
    LIMIT_FILE_SIZE: `That photo is too large. The limit is ${formatSize(MAX_IMAGE_BYTES)}.`,
    LIMIT_UNEXPECTED_FILE: `Unsupported image type. Use ${ALLOWED_TYPES.join(', ')}.`,
    LIMIT_FILE_COUNT: 'Only one photo can be attached to a recipe.',
    LIMIT_FIELD_VALUE: 'That recipe is too long to save.',
};

function receiveUpload(req, res, next) {
    upload(req, res, (err) => {
        if (!err) return next();

        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: MESSAGES[err.code] || 'That upload could not be read.' });
        }
        return next(err);
    });
}

/**
 * Lifts the JSON out of the `payload` part so the controller sees the same
 * `req.body` it would have got from a plain JSON request.
 */
function parsePayload(req, res, next) {
    if (typeof req.body?.payload !== 'string') return next();

    try {
        const parsed = JSON.parse(req.body.payload);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return res.status(400).json({ message: 'Malformed recipe payload.' });
        }
        req.body = parsed;
        return next();
    } catch {
        return res.status(400).json({ message: 'Malformed recipe payload.' });
    }
}

module.exports = [receiveUpload, parsePayload];
