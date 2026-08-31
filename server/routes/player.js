const express = require('express');
const pool = require('../db/db');
const requireAuth = require('../middleware/requireAuth');
const { toScheduleGame } = require('../lib/gameFormat');

const router = express.Router();

// =========================
// GET /api/players/me
// =========================

router.get('/me', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, r.name AS role,
                    t.id AS team_id, t.name AS team_name,
                    tm.position, tm.jersey_number
            FROM users u
            INNER JOIN roles r ON r.id = u.role_id
            LEFT JOIN team_memberships tm ON tm.user_id = u.id
            LEFT JOIN teams t ON t.id = tm.team_id
            WHERE u.id = ?
            ORDER BY tm.id ASC
            LIMIT 1`,
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const row = rows[0];

        res.json({
            id: String(row.id),
            name: `${row.first_name} ${row.last_name}`,
            email: row.email,
            role: row.role,
            phone: row.phone,
            position: row.position,
            jerseyNumber: row.jersey_number,
            teamId: row.team_id ? String(row.team_id) : null,
            teamName: row.team_name ?? null,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// =========================
// GET /api/players/me/team/roster
// =========================

router.get('/me/team/roster', requireAuth, async (req, res) => {
    try {
        const [teamRows] = await pool.query(
            `SELECT team_id FROM team_memberships WHERE user_id = ? ORDER BY id ASC LIMIT 1`,
            [req.user.id]
        );

        if (teamRows.length === 0) {
            return res.json([]);
        }

        const teamId = teamRows[0].team_id;

        const [rows] = await pool.query(
            `SELECT u.id, u.first_name, u.last_name, u.email, tm.position, tm.jersey_number
            FROM team_memberships tm
            INNER JOIN users u ON u.id = tm.user_id
            WHERE tm.team_id = ? AND tm.role_in_team = 'player' AND tm.user_id != ?`,
            [teamId, req.user.id]
        );

        res.json(rows.map((row) => ({
            id: String(row.id),
            name: `${row.first_name} ${row.last_name}`,
            position: row.position,
            jerseyNumber: row.jersey_number,
            email: row.email,
        })));

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// =========================
// GET /api/players/me/team/schedule
// =========================

router.get('/me/team/schedule', requireAuth, async (req, res) => {
    try {
        const [teamRows] = await pool.query(
            `SELECT team_id FROM team_memberships WHERE user_id = ? ORDER BY id ASC LIMIT 1`,
            [req.user.id]
        );

        if (teamRows.length === 0) {
            return res.json([]);
        }

        const teamId = teamRows[0].team_id;

        const [rows] = await pool.query(
            `SELECT g.id, g.game_date, g.location, g.status,
                    g.home_team_id, g.away_team_id,
                    ht.name AS home_team_name, at.name AS away_team_name
            FROM games g
            INNER JOIN teams ht ON ht.id = g.home_team_id
            INNER JOIN teams at ON at.id = g.away_team_id
            WHERE g.home_team_id = ? OR g.away_team_id = ?
            ORDER BY g.game_date ASC`,
            [teamId, teamId]
        );

        res.json(rows.map((row) => toScheduleGame(row, teamId)));

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// =========================
// DELETE /api/players/me/team
// =========================

router.delete('/me/team', requireAuth, async (req, res) => {
    try {
        await pool.query(
            `DELETE FROM team_memberships WHERE user_id = ?`,
            [req.user.id]
        );

        res.status(204).send();

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
