const express = require('express');
const db = require('../models/db');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// ── GET /api/alerts?ward=73 ───────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { ward } = req.query;
  try {
    if (db.isInMemory) {
      let alerts = db.store.alerts.filter(a => a.is_active && (!a.expires_at || new Date(a.expires_at) > new Date()));
      if (ward) {
        const wardNum = parseInt(ward);
        alerts = alerts.filter(a => !a.ward_numbers || a.ward_numbers.includes(wardNum));
      }
      alerts.sort((a, b) => {
        const sevOrder = { critical: 3, warning: 2, info: 1 };
        return (sevOrder[b.severity] || 0) - (sevOrder[a.severity] || 0) || new Date(b.created_at) - new Date(a.created_at);
      });
      return res.json({ alerts });
    }
    const result = await db.query(
      `SELECT * FROM alerts WHERE is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW())
       ${ward ? 'AND (ward_numbers IS NULL OR $1 = ANY(ward_numbers))' : ''}
       ORDER BY severity DESC, created_at DESC`,
      ward ? [parseInt(ward)] : []
    );
    res.json({ alerts: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch alerts.' });
  }
});

// ── POST /api/alerts ──────────────────────────────────────────────────────────
router.post('/', authMiddleware, requireAdmin, async (req, res) => {
  const { alert_type, title_en, title_kn, body_en, body_kn, severity, ward_numbers, expires_at } = req.body;
  if (!alert_type || !title_en || !body_en) {
    return res.status(400).json({ error: 'alert_type, title_en, and body_en are required.' });
  }
  try {
    if (db.isInMemory) {
      const id = ++db.store.nextId;
      const alert = { id, alert_type, title_en, title_kn, body_en, body_kn, severity: severity || 'info', is_active: true, ward_numbers: ward_numbers || null, expires_at: expires_at || null, created_at: new Date().toISOString() };
      db.store.alerts.push(alert);
      return res.status(201).json({ alert });
    }
    const result = await db.query(
      `INSERT INTO alerts (alert_type, title_en, title_kn, body_en, body_kn, severity, ward_numbers, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [alert_type, title_en, title_kn, body_en, body_kn, severity || 'info', ward_numbers || null, expires_at || null]
    );
    res.status(201).json({ alert: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create alert.' });
  }
});

// ── DELETE /api/alerts/:id ────────────────────────────────────────────────────
router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    if (db.isInMemory) {
      const alert = db.store.alerts.find(a => a.id == req.params.id);
      if (alert) alert.is_active = false;
      return res.json({ message: 'Alert deactivated.' });
    }
    await db.query('UPDATE alerts SET is_active = FALSE WHERE id = $1', [req.params.id]);
    res.json({ message: 'Alert deactivated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate alert.' });
  }
});

module.exports = router;
