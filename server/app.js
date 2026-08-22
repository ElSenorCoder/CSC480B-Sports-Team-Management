const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const pool = require('./db/db');
const teamRoutes = require('./routes/team');
const playerRoutes = require('./routes/player');
const coachRoutes = require('./routes/coach');
const authRoutes = require('./routes/auth');

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: '*',
    credentials: true
}));

// =========================
// Data Validation Middleware
// =========================

const validateData = (requiredFields) => {
    return (req, res, next) => {
        const data = req.body;

        // Check that a body was sent
        if (!data || Object.keys(data).length === 0) {
            return res.status(400).json({
                error: 'Request body is required'
            });
        }

        // Check required fields
        const missingFields = requiredFields.filter(
            field =>
                data[field] === undefined ||
                data[field] === null ||
                data[field] === ''
        );

        if (missingFields.length > 0) {
            return res.status(400).json({
                error: 'Missing required fields',
                fields: missingFields
            });
        }

        next();
    };
};

// =========================
// Routes
// =========================

app.use('/api/teams', teamRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/coaches', coachRoutes);
app.use('/api/auth', authRoutes);

// =========================
// Welcome
// =========================

app.get('/', async (req, res) => {
    try {
        res.json('Welcome to our platform !');
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

app.get('/api/', async (req, res) => {
    try {
        res.json('Welcome to our platform !');
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

// =========================
// Start Server
// =========================

app.listen(3001, () => {
    console.log('Server running on port 3001');
});