const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/connectionDB.js');
const errorHandler = require('./middleware/errorHandler.js');

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173']
}));

app.get('/', (req, res) => {
    res.send('API is running...');
});

const PORT = process.env.PORT || 5002;

connectDB();
app.use('/recipe', require('./routes/recipeRoutes.js'));
app.use('/auth', require('./routes/authRoutes.js'));

app.use(errorHandler);

app.listen(PORT, (err) => {
    console.log("Server listening at " + PORT);
});
