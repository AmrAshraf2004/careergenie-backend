const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();

// REGISTER
router.post("/register", async (req, res) => {
    try {
        const {
            email,
            password,
            full_name,
            phone,
            country,
            years_of_experience,
            current_job_title,
            desired_role
        } = req.body;

        if (!email || !password || !full_name) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const existing = await pool.query(
            "SELECT candidate_id FROM candidate WHERE email = $1",
            [normalizedEmail]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({ error: "Email already exists" });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO candidate 
            (email, password_hash, full_name, phone, country, years_of_experience, current_job_title, desired_role)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            RETURNING candidate_id, email, full_name, created_at`,
            [
                normalizedEmail,
                password_hash,
                full_name,
                phone || null,
                country || null,
                years_of_experience || null,
                current_job_title || null,
                desired_role || null
            ]
        );

        res.status(201).json({ candidate: result.rows[0] });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// LOGIN
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Missing credentials" });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const result = await pool.query(
            "SELECT * FROM candidate WHERE email = $1",
            [normalizedEmail]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const candidate = result.rows[0];

        const valid = await bcrypt.compare(password, candidate.password_hash);

        if (!valid) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        await pool.query(
            "UPDATE candidate SET last_login_at = NOW() WHERE candidate_id = $1",
            [candidate.candidate_id]
        );

        const token = jwt.sign(
            { candidate_id: candidate.candidate_id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            token,
            candidate: {
                candidate_id: candidate.candidate_id,
                email: candidate.email,
                full_name: candidate.full_name
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;