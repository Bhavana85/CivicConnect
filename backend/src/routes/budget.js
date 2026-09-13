const express = require('express');
const db = require('../models/db');

const router = express.Router();

// ── GET /api/budget?year=2024 ─────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { year = 2024, department } = req.query;
  try {
    if (db.isInMemory) {
      let items = db.store.budget_items.filter(b => b.fiscal_year === parseInt(year));
      if (department) items = items.filter(b => b.department === department);
      return res.json({ budget_items: items, fiscal_year: parseInt(year) });
    }
    const conditions = ['fiscal_year = $1'];
    const values = [parseInt(year)];
    if (department) { conditions.push('department = $2'); values.push(department); }
    const result = await db.query(
      `SELECT * FROM budget_items WHERE ${conditions.join(' AND ')} ORDER BY allocated_amount DESC`, values
    );
    res.json({ budget_items: result.rows, fiscal_year: parseInt(year) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch budget data.' });
  }
});

// ── GET /api/budget/summary?year=2024 ────────────────────────────────────────
router.get('/summary', async (req, res) => {
  const { year = 2024 } = req.query;
  try {
    if (db.isInMemory) {
      const items = db.store.budget_items.filter(b => b.fiscal_year === parseInt(year));
      const departments = items.map(b => ({
        department: b.department,
        total_allocated: b.allocated_amount,
        total_spent: b.spent_amount,
        utilization_pct: Math.round((b.spent_amount / b.allocated_amount) * 1000) / 10,
      }));
      const totals = {
        total_allocated: items.reduce((s, b) => s + b.allocated_amount, 0),
        total_spent: items.reduce((s, b) => s + b.spent_amount, 0),
      };
      return res.json({ departments, totals, fiscal_year: parseInt(year) });
    }
    const result = await db.query(
      `SELECT department, SUM(allocated_amount) AS total_allocated, SUM(spent_amount) AS total_spent,
         ROUND(SUM(spent_amount) / NULLIF(SUM(allocated_amount), 0) * 100, 1) AS utilization_pct
       FROM budget_items WHERE fiscal_year = $1 GROUP BY department ORDER BY total_allocated DESC`, [parseInt(year)]
    );
    const totals = await db.query(
      `SELECT SUM(allocated_amount) AS total_allocated, SUM(spent_amount) AS total_spent
       FROM budget_items WHERE fiscal_year = $1`, [parseInt(year)]
    );
    res.json({ departments: result.rows, totals: totals.rows[0], fiscal_year: parseInt(year) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch budget summary.' });
  }
});

// ── GET /api/budget/years ─────────────────────────────────────────────────────
router.get('/years', async (req, res) => {
  try {
    if (db.isInMemory) {
      const years = [...new Set(db.store.budget_items.map(b => b.fiscal_year))].sort((a, b) => b - a);
      return res.json({ years });
    }
    const result = await db.query('SELECT DISTINCT fiscal_year FROM budget_items ORDER BY fiscal_year DESC');
    res.json({ years: result.rows.map(r => r.fiscal_year) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch fiscal years.' });
  }
});

module.exports = router;
