const express = require("express");
const pool = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Start session
router.post("/sessions", requireAuth, async (req, res) => {
    try {
        const { mode, language } = req.body;

        const result = await pool.query(
            `INSERT INTO practice_session (candidate_id, mode, language, status)
             VALUES ($1, $2, $3, 'ACTIVE')
             RETURNING practice_session_id, candidate_id, started_at, mode, language, status`,
            [req.user.candidate_id, mode || null, language || null]
        );

        res.status(201).json({ session: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// List my sessions
router.get("/sessions", requireAuth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT practice_session_id, started_at, ended_at, mode, language, status
             FROM practice_session
             WHERE candidate_id = $1
             ORDER BY started_at DESC`,
            [req.user.candidate_id]
        );

        res.json({ sessions: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get one session
router.get("/sessions/:id", requireAuth, async (req, res) => {
    try {
        const sessionId = Number(req.params.id);

        const result = await pool.query(
            `SELECT practice_session_id, candidate_id, started_at, ended_at, mode, language, status, recording_url, transcript_text
             FROM practice_session
             WHERE practice_session_id = $1 AND candidate_id = $2`,
            [sessionId, req.user.candidate_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Session not found" });
        }

        res.json({ session: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// End session
router.post("/sessions/:id/end", requireAuth, async (req, res) => {
    try {
        const sessionId = Number(req.params.id);

        const result = await pool.query(
            `UPDATE practice_session
             SET status = 'ENDED', ended_at = NOW()
             WHERE practice_session_id = $1 AND candidate_id = $2 AND status = 'ACTIVE'
             RETURNING practice_session_id, status, ended_at`,
            [sessionId, req.user.candidate_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Active session not found" });
        }

        res.json({ session: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;