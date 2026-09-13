const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db      = require('../models/db');

const router = express.Router();

// OTP rate limiter — 3 requests per 15 minutes per IP
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { error: 'Too many OTP requests. Please wait 15 minutes.' },
});

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { full_name, email, phone, password, ward_number, preferred_lang } = req.body;
  if (!full_name || !email || !phone || !password) {
    return res.status(400).json({ error: 'full_name, email, phone, and password are required.' });
  }
  try {
    const password_hash = await bcrypt.hash(password, 12);

    // ── In-memory mode ──
    if (db.isInMemory) {
      const store = db.store;
      // Check duplicate
      if (store.users.find(u => u.email === email || u.phone === phone)) {
        return res.status(409).json({ error: 'Email or phone number already registered.' });
      }
      const id = ++store.nextId;
      const user = {
        id, full_name, email, phone, password_hash,
        ward_number: ward_number || null, preferred_lang: preferred_lang || 'en',
        is_verified: false, role: 'citizen', created_at: new Date().toISOString(),
      };
      store.users.push(user);
      const token = jwt.sign(
        { id: user.id, role: user.role, is_verified: user.is_verified },
        process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN }
      );
      const { password_hash: _, ...userPublic } = user;
      return res.status(201).json({ user: userPublic, token });
    }

    // ── PostgreSQL mode ──
    const result = await db.query(
      `INSERT INTO users (full_name, email, phone, password_hash, ward_number, preferred_lang)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, full_name, email, phone, ward_number, preferred_lang, is_verified, role, created_at`,
      [full_name, email, phone, password_hash, ward_number || null, preferred_lang || 'en']
    );
    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, role: user.role, is_verified: user.is_verified },
      process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    res.status(201).json({ user, token });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email or phone number already registered.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { identifier, password, roleType = 'citizen' } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Identifier and password are required.' });
  }

  try {
    let user = null;

    // ── In-memory mode ──
    if (db.isInMemory) {
      const store = db.store;
      if (roleType === 'citizen') {
        user = store.users.find(u => u.email === identifier && u.role === 'citizen');
      } else if (roleType === 'government') {
        const ward = parseInt(identifier) || 0;
        user = store.users.find(u => u.ward_number === ward && u.role === 'government');
      } else if (roleType === 'admin') {
        user = store.users.find(u => u.email === identifier && u.role === 'admin');
      } else {
        return res.status(400).json({ error: 'Invalid role type.' });
      }
    } else {
      // ── PostgreSQL mode ──
      let queryStr = '';
      let queryParams = [];

      if (roleType === 'citizen') {
        queryStr = 'SELECT * FROM users WHERE email = $1 AND role = $2';
        queryParams = [identifier, 'citizen'];
      } else if (roleType === 'government') {
        queryStr = 'SELECT * FROM users WHERE ward_number = $1 AND role = $2';
        queryParams = [parseInt(identifier) || 0, 'government'];
      } else if (roleType === 'admin') {
        queryStr = 'SELECT * FROM users WHERE email = $1 AND role = $2';
        queryParams = [identifier, 'admin'];
      } else {
        return res.status(400).json({ error: 'Invalid role type.' });
      }

      const result = await db.query(queryStr, queryParams);
      user = result.rows[0];
    }

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, is_verified: user.is_verified },
      process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    const { password_hash: _, ...userPublic } = user;
    res.json({ user: userPublic, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// ── POST /api/auth/request-otp ────────────────────────────────────────────────
router.post('/request-otp', otpLimiter, async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number required.' });

  try {
    if (db.isInMemory) {
      const user = db.store.users.find(u => u.phone === phone);
      if (!user) return res.status(404).json({ error: 'No account found with this phone number.' });
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      console.log(`[DEV] OTP for ${phone}: ${otp}`);
      return res.json({ message: 'OTP sent to your mobile number.' });
    }

    const userResult = await db.query('SELECT id FROM users WHERE phone = $1', [phone]);
    if (!userResult.rows.length) {
      return res.status(404).json({ error: 'No account found with this phone number.' });
    }
    const userId = userResult.rows[0].id;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await db.query(
      `INSERT INTO residency_verifications (user_id, method, otp_hash, otp_expires_at, status)
       VALUES ($1, 'otp_phone', $2, $3, 'pending')
       ON CONFLICT (user_id) DO UPDATE SET otp_hash = $2, otp_expires_at = $3, status = 'pending'`,
      [userId, otpHash, expiresAt]
    );
    console.log(`[DEV] OTP for ${phone}: ${otp}`);
    res.json({ message: 'OTP sent to your mobile number.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send OTP.' });
  }
});

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required.' });

  try {
    if (db.isInMemory) {
      const user = db.store.users.find(u => u.phone === phone);
      if (!user) return res.status(404).json({ error: 'User not found.' });
      user.is_verified = true;
      const token = jwt.sign(
        { id: user.id, role: user.role, is_verified: true },
        process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN }
      );
      return res.json({ message: 'Residency verified successfully!', token });
    }

    const userResult = await db.query('SELECT id FROM users WHERE phone = $1', [phone]);
    if (!userResult.rows.length) return res.status(404).json({ error: 'User not found.' });
    const userId = userResult.rows[0].id;
    const verResult = await db.query(
      `SELECT otp_hash, otp_expires_at FROM residency_verifications
       WHERE user_id = $1 AND status = 'pending' AND otp_expires_at > NOW()`, [userId]
    );
    if (!verResult.rows.length) return res.status(400).json({ error: 'OTP expired or not found.' });
    const { otp_hash } = verResult.rows[0];
    const isValid = await bcrypt.compare(otp, otp_hash);
    if (!isValid) return res.status(400).json({ error: 'Invalid OTP.' });
    await db.query('UPDATE users SET is_verified = TRUE WHERE id = $1', [userId]);
    await db.query(`UPDATE residency_verifications SET status = 'approved', reviewed_at = NOW() WHERE user_id = $1`, [userId]);
    const userFull = await db.query('SELECT id, role, is_verified FROM users WHERE id = $1', [userId]);
    const u = userFull.rows[0];
    const token = jwt.sign(
      { id: u.id, role: u.role, is_verified: true },
      process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    res.json({ message: 'Residency verified successfully!', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verification failed.' });
  }
});

module.exports = router;
