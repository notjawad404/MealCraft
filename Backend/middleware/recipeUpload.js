const multer = require('multer');
const { MAX_IMAGE_BYTES, ALLOWED_TYPES, formatSize } = require('../utils/imageData');

/**
 * Accepts a recipe write as either plain JSON or multipart with a photo.
 * See docs/BACKEND.md.
 */
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_IMAGE_BYTES,
        files: 1,
        fields: 4,
        fieldSize: 512 * 1024,
    },
    fileFilter(req, file, cb) {
        // First pass on the declared type; the bytes are checked in the controller.
        if (!ALLOWED_TYPES.includes(String(file.mimetype).toLowerCase())) {
            cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'image'));
            return;
        }
        cb(null, true);
    },
}).single('image');

// multer errors, restated in the `{ message }` shape every write answers with.
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

/** Lifts the JSON out of the `payload` part into `req.body`. */
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
