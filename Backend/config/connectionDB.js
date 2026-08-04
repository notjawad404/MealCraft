const mongoose = require('mongoose');

const diagnose = (err) => {
    if (err.syscall === 'querySrv' && err.code === 'ECONNREFUSED') {
        const servers = require('dns').getServers().join(', ');
        return [
            '',
            'A mongodb+srv:// URI needs a DNS SRV lookup, and that lookup was refused.',
            `Node is currently using these DNS servers: ${servers}`,
            'If that is 127.0.0.1, a local resolver (usually Docker Desktop or a VPN)',
            'owns the setting but is not running. Start it, or point the network',
            'adapter at 1.1.1.1 / 8.8.8.8.',
        ].join('\n');
    }

    if (err.name === 'MongoServerSelectionError') {
        return [
            '',
            'The cluster resolved but would not accept a connection. Check that the',
            'Atlas cluster is not paused and that this machine\'s IP is in the',
            'Network Access allowlist.',
        ].join('\n');
    }

    return '';
};

// Cached so a warm instance opens one connection, not one per request.
// Cleared on failure so the next request can retry.
let connection = null;

const connectDB = async () => {
    if (!process.env.CONNECTION_STRING) {
        throw new Error('CONNECTION_STRING is not set. Check Backend/.env');
    }

    if (connection) return connection;

    connection = mongoose
        .connect(process.env.CONNECTION_STRING, {
            serverSelectionTimeoutMS: 8000,
        })
        .then((m) => {
            console.log('Connected to MongoDB');
            return m;
        })
        .catch((err) => {
            connection = null;
            console.error(`\nCould not connect to MongoDB: ${err.message}`);
            const hint = diagnose(err);
            if (hint) console.error(hint);
            throw err;
        });

    return connection;
};

module.exports = connectDB;
