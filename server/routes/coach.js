const express = require('express');
const pool = require('../db/db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM coach');
    res.json(rows);
  } catch (error) {
    console.error(error)
    res.status(500).json({
        error: error.message
    });
  }
});

module.exports = router;