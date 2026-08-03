const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/connectionDB.js');
const errorHandler = require('./middleware/errorHandler.js');

dotenv.config();

// Node's resolver sometimes falls back to 127.0.0.1 instead of reading the
// adapter's DNS config, which breaks the SRV lookup a mongodb+srv:// URI needs.
// Set DNS_SERVERS in .env to point it somewhere that works. Unset = OS default.
if (process.env.DNS_SERVERS) {
    require('dns').setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()));
}

const app = express();

// CORS must be registered before the body parser: a malformed JSON body is
// rejected by express.json() and sent straight to the error handler, so any
// middleware after it never runs. Without the headers already set, the browser
// reports an opaque CORS failure instead of the real 400.
app.use(cors({
    origin: (origin, callback) => {
        console.log("Incoming Origin:", origin);

        const allowedOrigins = process.env.ALLOWED_ORIGINS
            ?.split(',')
            .map(o => o.trim());

        console.log("Allowed Origins:", allowedOrigins);

        if (!origin || allowedOrigins.includes(origin)) {
            console.log("✅ CORS Allowed");
            callback(null, true);
        } else {
            console.log("❌ CORS Blocked:", origin);
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true
}));
// Recipe images ride along in the JSON body as base64 data URIs, which sails
// past body-parser's 100 kB default. The ceiling sits above the per-image limit
// in utils/imageData.js to leave room for base64's ~4/3 expansion and the rest
// of the recipe; anything over it is rejected by the error handler as a 413.
app.use(express.json({ limit: '4mb' }));

app.get('/', (req, res) => {
    res.send('API is running...');
});

app.use('/recipe', require('./routes/recipeRoutes.js'));
app.use('/auth', require('./routes/authRoutes.js'));

app.use(errorHandler);

const PORT = process.env.PORT || 5002;

// Only accept traffic once the database is actually reachable. Serving requests
// without it just turns every route into a 10s buffering timeout, which reads
// like an application bug rather than a connection failure.
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
