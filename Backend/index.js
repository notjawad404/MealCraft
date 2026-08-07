const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/connectionDB.js');
const errorHandler = require('./middleware/errorHandler.js');

dotenv.config();

// Local-only DNS override; the platform resolver is the only one on Vercel.
if (process.env.DNS_SERVERS && !process.env.VERCEL) {
    require('dns').setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()));
}

const app = express();

// Both sides are normalised so a trailing slash or casing cannot mismatch.
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
        // No Origin header: not a browser request.
        if (!origin) return callback(null, true);

        if (allowAnyOrigin || !allowedOrigins.length) return callback(null, true);

        if (allowedOrigins.includes(normaliseOrigin(origin))) return callback(null, true);

        // Refused by omitting the header, so the caller still sees its status.
        console.warn(`Blocked CORS origin: ${origin}`);
        callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
};

// cors() answers preflight OPTIONS itself; no app.options() route is needed.
app.use(cors(corsOptions));

// Photos go through middleware/recipeUpload.js, not this body parser.
app.use(express.json({ limit: '512kb' }));

app.get('/', (req, res) => {
    res.send('API is running...');
});

// Connected per request, so a failure is answerable instead of a crashed boot.
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
app.use('/api/cookbooks', require('./routes/cookbookRoutes.js'));
app.use('/cookbooks', require('./routes/cookbookRoutes.js'));

app.use((req, res) => {
    res.status(404).json({ success: false, message: `Not found: ${req.method} ${req.originalUrl}` });
});

app.use(errorHandler);

// Vercel imports the export instead; binding a port there would hang the build.
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
