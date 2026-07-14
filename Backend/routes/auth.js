const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db/connect");

const router = express.Router();

/**
 * POST /auth/register
 * Public registration — customers only, per the brief
 * ("Customer can register, log in..."). Agents and admins
 * are provisioned directly in the DB (via seed script or
 * an admin-only endpoint), not self-registered.
 */
router.post("/register", (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, and password are required" });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  const result = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, 'customer')`
    )
    .run(name, email.toLowerCase(), passwordHash, phone || null);

  const user = { id: result.lastInsertRowid, name, email: email.toLowerCase(), role: "customer" };
  const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "7d" });

  res.status(201).json({ token, user });
});

/**
 * POST /auth/login
 * Works for all 3 roles — role is determined by the DB record,
 * not sent by the client (so a customer can't just claim to be admin).
 */
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const userRow = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());

  if (!userRow || !bcrypt.compareSync(password, userRow.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const user = {
    id: userRow.id,
    name: userRow.name,
    email: userRow.email,
    role: userRow.role,
  };

  const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "7d" });

  res.json({ token, user });
});

/**
 * GET /auth/me
 * Returns the current logged-in user, based on the token.
 * Useful for the frontend to restore session on page refresh.
 */
const { requireAuth } = require("../middleware/auth");
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;