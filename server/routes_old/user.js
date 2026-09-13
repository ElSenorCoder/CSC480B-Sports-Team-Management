const express = require('express');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// =========================
// GET /api/user/me
// =========================
// Profile is not player- or coach-specific — every user has one.

router.get('/me', requireAuth, (req, res) => {
    res.json({
        id: String(req.user.id),
        name: `${req.user.first_name} ${req.user.last_name}`,
        email: req.user.email,
        role: req.user.role,
        phone: req.user.phone,
    });
});

module.exports = router;
