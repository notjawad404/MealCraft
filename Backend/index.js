const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/connectionDB.js');
const errorHandler = require('./middleware/errorHandler.js');

dotenv.config();


if (process.env.DNS_SERVERS) {
    require('dns').setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()));
}

const app = express();

const corsOptions = {
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json({ limit: '4mb' }));

app.get('/', (req, res) => {
    res.send('API is running...');
});

app.use('/recipe', require('./routes/recipeRoutes.js'));
app.use('/auth', require('./routes/authRoutes.js'));

app.use(errorHandler);

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
