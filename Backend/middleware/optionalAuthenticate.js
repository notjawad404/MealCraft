const jwt = require('jsonwebtoken');

/**
 * Reads the token when one is sent, and carries on either way.
 *
 * For the routes that answer everybody but answer the owner differently. A
 * token that will not verify is treated as no token at all rather than as a
 * failure: the route does not require one, so there is nothing to refuse.
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
