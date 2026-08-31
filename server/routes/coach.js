const express = require('express');
const pool = require('../db/db');
const requireAuth = require('../middleware/requireAuth');
const { toScheduleGame } = require('../lib/gameFormat');

const router = express.Router();

// =========================
// Require Coach Role
// =========================

function requireCoach(req, res, next) {
    if (req.user.role !== 'coach') {
        return res.status(403).json({ error: 'Coach access required' });
    }
    next();
}

router.use(requireAuth, requireCoach);

// =========================
// Resolve the team this coach manages
// =========================

async function getManagedTeamId(userId) {
    const [rows] = await pool.query(
        `SELECT team_id FROM team_memberships
        WHERE user_id = ? AND role_in_team IN ('head_coach', 'assistant_coach')
        ORDER BY id ASC
        LIMIT 1`,
        [userId]
    );

    return rows.length > 0 ? rows[0].team_id : null;
}

// =========================
// GET /api/coaches/me/team
// =========================

router.get('/me/team', async (req, res) => {
    try {
        const teamId = await getManagedTeamId(req.user.id);

        if (!teamId) {
            return res.status(404).json({ error: 'No managed team found' });
        }

        const [teamRows] = await pool.query(
            `SELECT id, name FROM teams WHERE id = ?`,
            [teamId]
        );

        const [rosterRows] = await pool.query(
            `SELECT u.id, u.first_name, u.last_name, u.email, tm.position, tm.jersey_number
            FROM team_memberships tm
            INNER JOIN users u ON u.id = tm.user_id
            WHERE tm.team_id = ? AND tm.role_in_team = 'player'`,
            [teamId]
        );

        res.json({
            id: String(teamRows[0].id),
            name: teamRows[0].name,
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
        res.status(500).json({ error: error.message });
    }
});

// =========================
// GET /api/coaches/me/team/schedule
// =========================

router.get('/me/team/schedule', async (req, res) => {
    try {
        const teamId = await getManagedTeamId(req.user.id);

        if (!teamId) {
            return res.json([]);
        }

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
// GET /api/coaches/me/team/join-requests
// =========================

router.get('/me/team/join-requests', async (req, res) => {
    try {
        const teamId = await getManagedTeamId(req.user.id);

        if (!teamId) {
            return res.json([]);
        }

        const [rows] = await pool.query(
            `SELECT r.id, r.requested_at, u.id AS user_id, u.first_name, u.last_name, u.email
            FROM team_join_requests r
            INNER JOIN users u ON u.id = r.user_id
            WHERE r.team_id = ? AND r.status = 'pending'
            ORDER BY r.requested_at ASC`,
            [teamId]
        );

        res.json(rows.map((row) => ({
            id: String(row.id),
            userId: String(row.user_id),
            name: `${row.first_name} ${row.last_name}`,
            email: row.email,
            requestedAt: row.requested_at,
        })));

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// =========================
// PATCH /api/coaches/me/team/join-requests/:id
// =========================

router.patch('/me/team/join-requests/:id', async (req, res) => {
    try {
        const teamId = await getManagedTeamId(req.user.id);
        const { id } = req.params;
        const { status, position, jerseyNumber } = req.body;

        if (!teamId) {
            return res.status(404).json({ error: 'No managed team found' });
        }

        if (status !== 'approved' && status !== 'rejected') {
            return res.status(400).json({ error: "status must be 'approved' or 'rejected'" });
        }

        const [requestRows] = await pool.query(
            `SELECT * FROM team_join_requests WHERE id = ? AND team_id = ? AND status = 'pending'`,
            [id, teamId]
        );

        if (requestRows.length === 0) {
            return res.status(404).json({ error: 'Pending join request not found' });
        }

        const joinRequest = requestRows[0];

        if (status === 'approved') {
            try {
                await pool.query(
                    `INSERT INTO team_memberships (team_id, user_id, role_in_team, position, jersey_number)
                    VALUES (?, ?, 'player', ?, ?)`,
                    [teamId, joinRequest.user_id, position ?? null, jerseyNumber ?? null]
                );
            } catch (error) {
                if (error.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ error: 'Player is already on this team' });
                }
                throw error;
            }
        }

        await pool.query(
            `UPDATE team_join_requests SET status = ? WHERE id = ?`,
            [status, id]
        );

        res.json({ id, status });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// =========================
// DELETE /api/coaches/me/team/roster/:userId
// =========================

router.delete('/me/team/roster/:userId', async (req, res) => {
    try {
        const teamId = await getManagedTeamId(req.user.id);
        const { userId } = req.params;

        if (!teamId) {
            return res.status(404).json({ error: 'No managed team found' });
        }

        await pool.query(
            `DELETE FROM team_memberships WHERE team_id = ? AND user_id = ?`,
            [teamId, userId]
        );

        res.status(204).send();

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// =========================
// POST /api/coaches/me/team/schedule
// =========================

router.post('/me/team/schedule', async (req, res) => {
    try {
        const teamId = await getManagedTeamId(req.user.id);
        const { opponentTeamId, date, time, location, homeAway } = req.body;

        if (!teamId) {
            return res.status(404).json({ error: 'No managed team found' });
        }

        if (!opponentTeamId || !date || !time || !location || !homeAway) {
            return res.status(400).json({ error: 'opponentTeamId, date, time, location, and homeAway are required' });
        }

        const homeTeamId = homeAway === 'home' ? teamId : opponentTeamId;
        const awayTeamId = homeAway === 'home' ? opponentTeamId : teamId;
        const gameDate = `${date} ${time}:00`;

        const [result] = await pool.query(
            `INSERT INTO games (home_team_id, away_team_id, game_date, location)
            VALUES (?, ?, ?, ?)`,
            [homeTeamId, awayTeamId, gameDate, location]
        );

        res.status(201).json({ id: result.insertId });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// =========================
// PATCH /api/coaches/me/team/schedule/:gameId
// =========================

router.patch('/me/team/schedule/:gameId', async (req, res) => {
    try {
        const teamId = await getManagedTeamId(req.user.id);
        const { gameId } = req.params;
        const { date, time, location, status } = req.body;

        if (!teamId) {
            return res.status(404).json({ error: 'No managed team found' });
        }

        const fields = [];
        const values = [];

        if (date && time) {
            fields.push('game_date = ?');
            values.push(`${date} ${time}:00`);
        }
        if (location) {
            fields.push('location = ?');
            values.push(location);
        }
        if (status) {
            fields.push('status = ?');
            values.push(status);
        }

        if (fields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(gameId, teamId, teamId);

        await pool.query(
            `UPDATE games SET ${fields.join(', ')}
            WHERE id = ? AND (home_team_id = ? OR away_team_id = ?)`,
            values
        );

        res.status(204).send();

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// =========================
// DELETE /api/coaches/me/team/schedule/:gameId
// =========================

router.delete('/me/team/schedule/:gameId', async (req, res) => {
    try {
        const teamId = await getManagedTeamId(req.user.id);
        const { gameId } = req.params;

        if (!teamId) {
            return res.status(404).json({ error: 'No managed team found' });
        }

        await pool.query(
            `DELETE FROM games WHERE id = ? AND (home_team_id = ? OR away_team_id = ?)`,
            [gameId, teamId, teamId]
        );

        res.status(204).send();

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
