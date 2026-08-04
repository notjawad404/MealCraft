const jwt = require('jsonwebtoken');

/**
 * Reads the token when one is sent, and carries on either way. An unverifiable
 * token is treated as no token rather than as a failure.
 */
module.exports = function optionalAuthenticate(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
        try {
            req.user = jwt.verify(token, process.env.JWT_SECRET);
        } catch {
            /* unreadable token — the request continues as a stranger's */
        }
    }

    next();
};
