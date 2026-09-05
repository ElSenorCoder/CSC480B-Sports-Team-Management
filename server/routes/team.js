const express = require('express');
const pool = require('../db/db');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();


// Return The user's team
router.post('/me', async (req, res) => {
    try {
        console.log('USER/ME ROUTE HIT');

        // =========================
        // Get session token from cookie
        // =========================

        const sessionToken = req.cookies.sessionToken;

        if (!sessionToken) {
            return res.status(401).json({
                error: 'Not authenticated'
            });
        }

        console.log('Session token:', sessionToken);

        // =========================
        // Find valid session + user
        // =========================

        const [rows] = await pool.query(
            `SELECT
                u.id,
                u.username,

                COALESCE(
                    JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'team_id', tr.team_id,
                            'team_name', tr.team_name,
                            'role_in_team', tr.role_in_team,
                            'joined_at', tr.joined_at
                        )
                    ),
                    JSON_ARRAY()
                ) AS teams

            FROM sessions s

            INNER JOIN users u
                ON u.id = s.user_id

            INNER JOIN roles r
                ON r.id = u.role_id

            LEFT JOIN view_team_rosters tr
                ON tr.user_id = u.id

            WHERE s.session_token = ?
            AND s.expires_at > NOW()
            AND u.is_active = 1

            GROUP BY
                u.id,
                u.username,
                r.name`,
            [sessionToken]
        );


        // =========================
        // Invalid / expired session
        // =========================

        if (rows.length === 0) {
            return res.status(401).json({
                error: 'Invalid or expired session'
            });
        }

        console.log("rows");
        console.log(rows);
        

        const user = rows[0];

        // =========================
        // Return current user
        // =========================

        return res.status(200).json({
            result: user
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: 'Internal server error'
        });
    }
});


// Return The team's game
router.post('/:id/games', async (req, res) => {
    try {

        // =========================
        // Get team ID from URL
        // =========================

        const teamId = req.params.id;

        console.log('Team ID:', teamId);

        // =========================
        // Get session token from cookie
        // =========================

        const sessionToken = req.cookies.sessionToken;

        if (!sessionToken) {
            return res.status(401).json({
                error: 'Not authenticated'
            });
        }

        console.log('Session token:', sessionToken);

        // =========================
        // Validate session
        // =========================

        const [sessionRows] = await pool.query(
            `SELECT user_id
             FROM sessions
             WHERE session_token = ?
               AND expires_at > NOW()`,
            [sessionToken]
        );

        if (sessionRows.length === 0) {
            return res.status(401).json({
                error: 'Invalid or expired session'
            });
        }

        // =========================
        // Get games for team
        // =========================

        const [rows] = await pool.query(
            `SELECT
                game_id,
                home_team,
                away_team,
                location,
                game_date,
                home_team_score,
                away_team_score,
                CASE
                    WHEN home_team_id = ? THEN 'home'
                    ELSE 'away'
                END AS home_or_away,
                status

             FROM view_game_schedule

             WHERE home_team_id = ?
                OR away_team_id = ?

             ORDER BY game_date ASC`,
            [teamId, teamId, teamId]
        );

        console.log('Games:');
        console.log(rows);

        // =========================
        // Return games
        // =========================

        return res.status(200).json({
            games: rows
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: error.message
        });
    }
});


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