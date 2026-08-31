const express = require('express');
const pool = require('../db/db');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// mysql2 returns BIGINT columns as JS numbers; the frontend's Team.id is a
// string everywhere else (session/user ids are stringified too), so keep
// team ids consistent or === comparisons against other endpoints silently
// fail.
function toTeamSummary(row) {
    return {
        id: String(row.id),
        name: row.name,
        description: row.description,
    };
}


// Get all teams
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM teams'
        );

        res.json(rows.map(toTeamSummary));

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

        res.json(rows.map(toTeamSummary));

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: error.message
        });
    }
});


// Get team by id, including its player roster
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

        const [rosterRows] = await pool.query(
            `SELECT u.id, u.first_name, u.last_name, u.email, tm.position, tm.jersey_number
            FROM team_memberships tm
            INNER JOIN users u ON u.id = tm.user_id
            WHERE tm.team_id = ? AND tm.role_in_team = 'player'`,
            [id]
        );

        res.json({
            id: String(rows[0].id),
            name: rows[0].name,
            description: rows[0].description,
            roster: rosterRows.map((row) => ({
                id: String(row.id),
                name: `${row.first_name} ${row.last_name}`,
                position: row.position,
                jerseyNumber: row.jersey_number,
                email: row.email,
            })),
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: error.message
        });
    }
});


// Request to join a team
// Idempotent: returns the existing pending request instead of duplicating it
router.post('/:id/join-requests', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const [existing] = await pool.query(
            `SELECT id FROM team_join_requests
            WHERE team_id = ? AND user_id = ? AND status = 'pending'`,
            [id, req.user.id]
        );

        if (existing.length > 0) {
            return res.status(200).json({ id: existing[0].id, status: 'pending' });
        }

        const [result] = await pool.query(
            `INSERT INTO team_join_requests (team_id, user_id, status)
            VALUES (?, ?, 'pending')`,
            [id, req.user.id]
        );

        res.status(201).json({ id: result.insertId, status: 'pending' });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: error.message
        });
    }
});


module.exports = router;