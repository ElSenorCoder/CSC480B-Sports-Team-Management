const express = require('express');

const pool = require('../db/db');

const router = express.Router();

// =========================
// Current User
// =========================

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
                u.first_name,
                u.last_name,
                u.email,
                u.phone,
                u.is_active,
                r.name AS role,

                COALESCE(
                    JSON_ARRAYAGG(
                        JSON_OBJECT(
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
                u.first_name,
                u.last_name,
                u.email,
                u.phone,
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

module.exports = router;
