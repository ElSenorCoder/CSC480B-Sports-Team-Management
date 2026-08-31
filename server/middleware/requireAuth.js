const pool = require('../db/db');

// =========================
// Require Authenticated Session
// =========================
// Reads the session token from either the Authorization header
// (Bearer <token>, sent by the React app) or the sessionToken cookie
// set at login, and resolves it to the active user.

async function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization || '';
        const bearerToken = authHeader.startsWith('Bearer ')
            ? authHeader.slice('Bearer '.length)
            : null;
        const token = bearerToken || req.cookies.sessionToken;

        if (!token) {
            return res.status(401).json({
                error: 'Authentication required'
            });
        }

        const [rows] = await pool.query(
            `SELECT u.id, u.first_name, u.last_name, u.email, r.name AS role
            FROM sessions s
            INNER JOIN users u ON u.id = s.user_id
            INNER JOIN roles r ON r.id = u.role_id
            WHERE s.session_token = ?
            AND s.expires_at > NOW()
            AND u.is_active = 1`,
            [token]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                error: 'Invalid or expired session'
            });
        }

        req.user = rows[0];
        next();

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: 'Internal server error'
        });
    }
}

module.exports = requireAuth;
