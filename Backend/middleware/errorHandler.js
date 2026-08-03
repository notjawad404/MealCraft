module.exports = function errorHandler(err, req, res, next) {
    // body-parser rejects oversized bodies before any route runs. Its own
    // message ("request entity too large") tells the user nothing they can act
    // on, and in practice this only ever fires on an image that slipped past
    // the client-side downscaling.
    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            success: false,
            message: 'That recipe is too large to send. Try a smaller image.',
        });
    }

    if (err.name === 'ValidationError') {
        const first = Object.values(err.errors ?? {})[0];
        return res.status(400).json({
            success: false,
            message: first?.message ?? 'Some fields are invalid.',
        });
    }

    const status = err.status ?? 500;
    res.status(status).json({
        success: false,
        message: err.message ?? 'Internal server error',
    });
};
