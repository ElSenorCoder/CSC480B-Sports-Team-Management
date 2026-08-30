const express = require('express');
const pool = require('../db/db');

const router = express.Router();


// Get all teams
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM teams'
        );

        res.json(rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: error.message
        });
    }
});


// Get team by name
// Example: /api/teams/search?name=Bears
router.get('/search', async (req, res) => {
    try {
        const { name } = req.query;

        // Validate input
        if (!name) {
            return res.status(400).json({
                error: 'Team name is required'
            });
        }

        const [rows] = await pool.query(
            'SELECT * FROM teams WHERE name LIKE ?',
            [`%${name}%`]
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


// Get team by id
// Example: /api/teams/3
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(
            'SELECT * FROM teams WHERE id = ?',
            [id]
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