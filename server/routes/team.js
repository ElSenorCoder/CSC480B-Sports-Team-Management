const express = require('express');
const pool = require('../db/db');

const router = express.Router();


// Get all teams
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM team'
        );

        res.json(rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: error.message
        });
    }
});


// Get team by name and city
// Example: /api/teams/search?name=Bears&city=Chicago
router.get('/search', async (req, res) => {
    try {
        const { name, city } = req.query;

        console.log('Searching for team:', {
            name,
            city
        });

        // Validate input
        if (!name || !city) {
            return res.status(400).json({
                error: 'Team name and city are required'
            });
        }

        const [rows] = await pool.query(
            'SELECT * FROM team WHERE Name = ? AND City = ?',
            [name, city]
        );

        // Team not found
        if (rows.length === 0) {
            return res.status(404).json({
                error: 'Team not found'
            });
        }

        res.json(rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: error.message
        });
    }
});


// Get team by teamNumber
// Example: /api/teams/123
router.get('/:teamNumber', async (req, res) => {
    try {
        const { teamNumber } = req.params;

        const [rows] = await pool.query(
            'SELECT * FROM team WHERE teamNumber = ?',
            [teamNumber]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                error: 'Team not found'
            });
        }

        res.json(rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: error.message
        });
    }
});


module.exports = router;