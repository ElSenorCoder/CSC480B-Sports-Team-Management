const express = require('express');
const crypto = require('crypto');

const pool = require('../db/db');

const router = express.Router();

// =========================
// Encrypt Password
// =========================

const encryptPassword = (password) => {
    return crypto
        .createHash('sha256')
        .update(password)
        .digest('hex');
};

// =========================
// Login
// =========================

router.post('/login', async (req, res) => {
    try {
        console.log('LOGIN ROUTE HIT');

        const { identifier, password } = req.body;

        // =========================
        // Validate credentials
        // =========================

        if (!identifier || !password) {
            return res.status(400).json({
                error: 'Username and password are required'
            });
        }

        // =========================
        // Encrypt Password
        // =========================

        const encryptedPassword = encryptPassword(password);

        // =========================
        // Check user in database
        // =========================

        const [rows] = await pool.query(
            `SELECT
                u.id,
                u.username,
                u.first_name,
                u.last_name,
                u.email,
                u.phone,
                r.name AS role
             FROM users u
             INNER JOIN roles r
                ON r.id = u.role_id
             WHERE (u.username = ? OR u.email = ?)
               AND u.password_hash = ?
               AND u.is_active = 1`,
            [
                identifier,
                identifier,
                encryptedPassword
            ]
        );

        // =========================
        // Invalid credentials
        // =========================

        if (rows.length === 0) {
            return res.status(401).json({
                error: 'Invalid username or password'
            });
        }

        const user = rows[0];

        console.log('Authenticated user:', user.id);

        // =========================
        // Generate Session Token
        // =========================

        const sessionToken = crypto
            .randomBytes(32)
            .toString('hex');

        const expiresAt = new Date(
            Date.now() + 60 * 60 * 1000
        );


        // =========================
        // Store Session
        // =========================

        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Remove previous session
            await connection.query(
                `DELETE FROM sessions
                 WHERE user_id = ?`,
                [user.id]
            );
            

            // Create new session
            await connection.query(
                `INSERT INTO sessions
                    (session_token, user_id, expires_at)
                 VALUES (?, ?, ?)`,
                [
                    sessionToken,
                    user.id,
                    expiresAt
                ]
            );

            await connection.commit();

        } catch (error) {
            await connection.rollback();
            throw error;

        } finally {
            connection.release();
        }

        // =========================
        // Send Session Cookie
        // =========================

        res.cookie('sessionToken', sessionToken, {
            httpOnly: true,
            secure: false, // localhost development
            sameSite: 'lax',
            maxAge: 60 * 60 * 1000
        });

        // =========================
        // Login Successful
        // =========================

        res.status(200).send({
            user: {
                id: String(user.id),
                name: `${user.first_name} ${user.last_name}`,
                email: user.email,
                role: user.role
            },
            token: sessionToken,
            expiresIn: 3600
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: 'Internal server error'
        });
    }
});

module.exports = router;