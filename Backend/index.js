const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/connectionDB.js');
const errorHandler = require('./middleware/errorHandler.js');

dotenv.config();

// Overriding the resolver only makes sense on a developer machine, where a
// stopped Docker/VPN resolver breaks SRV lookups. On Vercel the platform
// resolver is the only one that works, so never touch it there.
if (process.env.DNS_SERVERS && !process.env.VERCEL) {
    require('dns').setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()));
}

const app = express();

// Browsers send Origin with no trailing slash and lowercase the scheme/host,
// so both sides get normalised. Pasting a URL straight from the address bar
// ("https://example.com/") is otherwise an invisible mismatch.
const normaliseOrigin = (origin) => origin.trim().replace(/\/+$/, '').toLowerCase();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(normaliseOrigin)
    .filter(Boolean);

const allowAnyOrigin = allowedOrigins.includes('*');

if (!allowedOrigins.length) {
    console.warn('ALLOWED_ORIGINS is not set - allowing every origin.');
}

const corsOptions = {
    origin(origin, callback) {
        // No Origin header at all: curl, health checks, server-to-server. These
        // are not browser requests, so CORS has nothing to protect.
        if (!origin) return callback(null, true);

        if (allowAnyOrigin || !allowedOrigins.length) return callback(null, true);

        if (allowedOrigins.includes(normaliseOrigin(origin))) return callback(null, true);

        // Refusing by omitting the header rather than throwing: the browser
        // still blocks the response, but the caller gets the real status code
        // instead of a 500 from the error handler.
        console.warn(`Blocked CORS origin: ${origin}`);
        callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
};

// cors() answers preflight OPTIONS itself, so no separate app.options() route.
// Express 5 parses paths with path-to-regexp v8, where a bare "*" is a syntax
// error that throws at startup and takes the whole app down with it.
app.use(cors(corsOptions));

app.use(express.json({ limit: '4mb' }));

app.get('/', (req, res) => {
    res.send('API is running...');
});

// Serverless invocations start with no open connection, and connecting at
// module load would leave a crashed boot with no way to report why. Connecting
// here keeps the failure inside the request, so the response still carries the
// CORS headers the browser needs to surface the real error.
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        res.status(503).json({
            success: false,
            message: 'Database unavailable. Please try again shortly.',
        });
    }
});

app.use('/recipe', require('./routes/recipeRoutes.js'));
app.use('/auth', require('./routes/authRoutes.js'));

app.use((req, res) => {
    res.status(404).json({ success: false, message: `Not found: ${req.method} ${req.originalUrl}` });
});

app.use(errorHandler);

// Vercel imports this file and calls the export per request; binding a port
// there would hang the build. Locally we still want a real server.
if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 5002;
    connectDB()
        .then(() => {
            app.listen(PORT, () => {
                console.log(`Server listening at ${PORT}`);
            });
        })
        .catch(() => {
            console.error('Server not started.\n');
            process.exit(1);
        });
}

module.exports = app;
