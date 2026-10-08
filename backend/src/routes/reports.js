const express = require('express');
const db = require('../models/db');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// ── GET /api/reports ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { status, category, ward, priority, sort, page = 1, limit = 20 } = req.query;

  try {
    if (db.isInMemory) {
      let reports = [...db.store.reports];
      if (status) {
        const normStatus = normalizeStatus(status);
        reports = reports.filter(r => normalizeStatus(r.status) === normStatus);
      }
      if (category) reports = reports.filter(r => r.category === category);
      if (ward)     reports = reports.filter(r => r.ward_number === parseInt(ward));
      if (priority) {
        const pUpper = priority.toUpperCase();
        reports = reports.filter(r => (r.priority || 'MEDIUM').toUpperCase() === pUpper);
      }

      if (sort === 'priority') {
        reports.sort((a, b) => {
          const orderA = PRIORITY_ORDER[(a.priority || 'MEDIUM').toUpperCase()] || 3;
          const orderB = PRIORITY_ORDER[(b.priority || 'MEDIUM').toUpperCase()] || 3;
          if (orderA !== orderB) return orderA - orderB;
          return new Date(b.created_at) - new Date(a.created_at);
        });
      } else {
        reports.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);
      return res.json({ reports: reports.slice(offset, offset + parseInt(limit)), total: reports.length, page: parseInt(page), limit: parseInt(limit) });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const values = [];
    let i = 1;
    if (status)   {
      const normStatus = normalizeStatus(status);
      conditions.push(`(status = $${i} OR UPPER(status) = $${i})`);
      values.push(normStatus);
      i++;
    }
    if (category) { conditions.push(`category = $${i++}`);    values.push(category); }
    if (ward)     { conditions.push(`ward_number = $${i++}`); values.push(parseInt(ward)); }
    if (priority) {
      const pUpper = priority.toUpperCase();
      conditions.push(`(priority = $${i} OR UPPER(COALESCE(priority, 'MEDIUM')) = $${i})`);
      values.push(pUpper);
      i++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = sort === 'priority'
      ? `CASE UPPER(COALESCE(priority, 'MEDIUM')) WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 WHEN 'LOW' THEN 4 ELSE 5 END ASC, created_at DESC`
      : `created_at DESC`;

    const result = await db.query(
      `SELECT id, category, title, description, address_text, status, priority, upvotes, ward_number, assigned_to, photo_url,
         ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng, created_at, updated_at
       FROM reports ${where} ORDER BY ${orderBy} LIMIT $${i++} OFFSET $${i}`,
      [...values, parseInt(limit), offset]
    );
    const countResult = await db.query(`SELECT COUNT(*) FROM reports ${where}`, values);
    res.json({ reports: result.rows, total: parseInt(countResult.rows[0]?.count || 0), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch reports.' });
  }
});

// ── GET /api/reports/nearby ───────────────────────────────────────────────────
router.get('/nearby', async (req, res) => {
  const { lat, lng, radius = 2000 } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng are required.' });

  try {
    if (db.isInMemory) {
      return res.json({ reports: db.store.reports.slice(0, 50) });
    }
    const result = await db.query(
      `SELECT id, category, title, status, upvotes, ward_number, address_text,
         ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng,
         ST_Distance(location, ST_GeogFromText('SRID=4326;POINT(' || $2 || ' ' || $1 || ')')) AS distance_m, created_at
       FROM reports WHERE ST_DWithin(location, ST_GeogFromText('SRID=4326;POINT(' || $2 || ' ' || $1 || ')'), $3)
       ORDER BY distance_m ASC LIMIT 50`,
      [parseFloat(lat), parseFloat(lng), parseFloat(radius)]
    );
    res.json({ reports: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch nearby reports.' });
  }
});

// ── Status Workflow Rules ───────────────────────────────────────────────────
const VALID_WORKFLOW_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'VERIFIED',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'REJECTED',
];

const VALID_TRANSITIONS = {
  SUBMITTED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['VERIFIED', 'REJECTED'],
  VERIFIED: ['ASSIGNED'],
  ASSIGNED: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['UNDER_REVIEW', 'IN_PROGRESS'], // Allow reopening if problem persists
  REJECTED: ['UNDER_REVIEW'], // Allow appeal or administrative correction
};

const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const PRIORITY_ORDER = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
};

function computeDefaultPriority(category, title = '', description = '') {
  const text = `${title} ${description}`.toLowerCase();

  // 1. Critical triggers: life-threatening, emergency, public safety hazard, live wire, open manhole
  if (
    text.includes('emergency') ||
    text.includes('life threatening') ||
    text.includes('public safety') ||
    text.includes('gas leak') ||
    text.includes('live wire') ||
    text.includes('open manhole') ||
    text.includes('collapse') ||
    text.includes('fatal')
  ) {
    return 'CRITICAL';
  }

  // 2. High triggers: major water leak/pipeline burst, severe road damage, contamination, flooding
  if (
    text.includes('major leak') ||
    text.includes('pipe burst') ||
    text.includes('pipeline burst') ||
    text.includes('dangerous') ||
    text.includes('accident') ||
    text.includes('deep pothole') ||
    text.includes('flooding') ||
    text.includes('cave-in') ||
    text.includes('severe') ||
    category === 'sewage'
  ) {
    return 'HIGH';
  }

  // 3. Low triggers: cosmetic, beautification, minor park maintenance, paint, gardening
  if (
    text.includes('minor') ||
    text.includes('beautification') ||
    text.includes('park bench') ||
    text.includes('paint') ||
    text.includes('gardening') ||
    text.includes('cosmetic')
  ) {
    return 'LOW';
  }

  // 4. Category-based sensible baseline
  if (category === 'water' && (text.includes('leak') || text.includes('no water'))) {
    return 'HIGH';
  }

  // Default baseline
  return 'MEDIUM';
}

function normalizeStatus(status) {
  if (!status) return 'SUBMITTED';
  const s = String(status).toUpperCase();
  if (s === 'PENDING') return 'SUBMITTED';
  return s;
}

// ── GET /api/reports/stats ──────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    if (db.isInMemory) {
      const reports = db.store.reports || [];
      const stats = {
        total: reports.length,
        status: {
          SUBMITTED: reports.filter(r => normalizeStatus(r.status) === 'SUBMITTED').length,
          UNDER_REVIEW: reports.filter(r => normalizeStatus(r.status) === 'UNDER_REVIEW').length,
          VERIFIED: reports.filter(r => normalizeStatus(r.status) === 'VERIFIED').length,
          ASSIGNED: reports.filter(r => normalizeStatus(r.status) === 'ASSIGNED').length,
          IN_PROGRESS: reports.filter(r => normalizeStatus(r.status) === 'IN_PROGRESS').length,
          RESOLVED: reports.filter(r => normalizeStatus(r.status) === 'RESOLVED').length,
          REJECTED: reports.filter(r => normalizeStatus(r.status) === 'REJECTED').length,
        },
        priority: {
          CRITICAL: reports.filter(r => (r.priority || 'MEDIUM').toUpperCase() === 'CRITICAL').length,
          HIGH: reports.filter(r => (r.priority || 'MEDIUM').toUpperCase() === 'HIGH').length,
          MEDIUM: reports.filter(r => (r.priority || 'MEDIUM').toUpperCase() === 'MEDIUM').length,
          LOW: reports.filter(r => (r.priority || 'MEDIUM').toUpperCase() === 'LOW').length,
        },
      };
      return res.json({ stats });
    }

    const statusCounts = await db.query(
      `SELECT UPPER(status) AS status, COUNT(*) AS count FROM reports GROUP BY UPPER(status)`
    );
    const priorityCounts = await db.query(
      `SELECT UPPER(COALESCE(priority, 'MEDIUM')) AS priority, COUNT(*) AS count FROM reports GROUP BY UPPER(COALESCE(priority, 'MEDIUM'))`
    );
    const totalResult = await db.query('SELECT COUNT(*) AS total FROM reports');

    const statusObj = {
      SUBMITTED: 0,
      UNDER_REVIEW: 0,
      VERIFIED: 0,
      ASSIGNED: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      REJECTED: 0,
    };
    for (const row of statusCounts.rows) {
      const s = normalizeStatus(row.status);
      if (statusObj[s] !== undefined) statusObj[s] = parseInt(row.count);
    }

    const priorityObj = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };
    for (const row of priorityCounts.rows) {
      const p = String(row.priority).toUpperCase();
      if (priorityObj[p] !== undefined) priorityObj[p] = parseInt(row.count);
    }

    res.json({
      stats: {
        total: parseInt(totalResult.rows[0]?.total || 0),
        status: statusObj,
        priority: priorityObj,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch report statistics.' });
  }
});

// ── GET /api/reports/:id ──────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    if (db.isInMemory) {
      const report = db.store.reports.find(r => r.id == req.params.id);
      if (!report) return res.status(404).json({ error: 'Report not found.' });
      const history = (db.store.report_status_history || [])
        .filter(h => h.report_id == req.params.id)
        .sort((a, b) => new Date(a.changed_at) - new Date(b.changed_at));
      return res.json({ report: { ...report, status_history: history } });
    }
    const result = await db.query(
      `SELECT r.*, ST_Y(r.location::geometry) AS lat, ST_X(r.location::geometry) AS lng, u.full_name AS reporter_name
       FROM reports r LEFT JOIN users u ON r.user_id = u.id WHERE r.id = $1`, [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Report not found.' });
    
    const historyResult = await db.query(
      `SELECT id, old_status, new_status, remark, changed_by_role, changed_at
       FROM report_status_history WHERE report_id = $1 ORDER BY changed_at ASC`,
      [req.params.id]
    );

    const report = {
      ...result.rows[0],
      status: normalizeStatus(result.rows[0].status),
      status_history: historyResult.rows,
    };
    res.json({ report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch report.' });
  }
});

// ── GET /api/reports/:id/history ──────────────────────────────────────────────
router.get('/:id/history', async (req, res) => {
  try {
    if (db.isInMemory) {
      const history = (db.store.report_status_history || [])
        .filter(h => h.report_id == req.params.id)
        .sort((a, b) => new Date(a.changed_at) - new Date(b.changed_at))
        .map(h => ({
          id: h.id,
          report_id: h.report_id,
          old_status: h.old_status,
          new_status: h.new_status,
          remark: h.remark || null,
          changed_by_role: h.changed_by_role || 'administrator',
          changed_at: h.changed_at,
        }));
      return res.json({ history });
    }

    const result = await db.query(
      `SELECT id, report_id, old_status, new_status, remark, changed_by_role, changed_at
       FROM report_status_history WHERE report_id = $1 ORDER BY changed_at ASC`,
      [req.params.id]
    );
    res.json({ history: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch status history.' });
  }
});

// ── POST /api/reports ─────────────────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  const { category, title, description, lat, lng, address_text, ward_number, priority: requestedPriority } = req.body;
  if (!category || !title || !lat || !lng) {
    return res.status(400).json({ error: 'category, title, lat, and lng are required.' });
  }

  // Citizens cannot arbitrarily set priority; compute rule-based baseline
  let assignedPriority = computeDefaultPriority(category, title, description);
  // Admins or officials can optionally specify priority
  if (req.user && (req.user.role === 'admin' || req.user.role === 'government') && requestedPriority) {
    const reqUpper = String(requestedPriority).toUpperCase();
    if (VALID_PRIORITIES.includes(reqUpper)) {
      assignedPriority = reqUpper;
    }
  }

  try {
    if (db.isInMemory) {
      const id = ++db.store.nextId;
      const user = db.store.users.find(u => u.id === req.user.id);
      const createdAt = new Date().toISOString();
      const report = {
        id, user_id: req.user.id, category, title, description: description || '',
        lat: parseFloat(lat), lng: parseFloat(lng),
        address_text: address_text || '', ward_number: ward_number || null,
        status: 'SUBMITTED', priority: assignedPriority, upvotes: 0, photo_url: null, after_photo_url: null,
        reporter_name: user?.full_name || 'Citizen',
        created_at: createdAt, updated_at: createdAt,
      };
      db.store.reports.push(report);
      
      // Initialize status history
      if (!db.store.report_status_history) db.store.report_status_history = [];
      db.store.report_status_history.push({
        id: ++db.store.nextId,
        report_id: id,
        old_status: null,
        new_status: 'SUBMITTED',
        remark: 'Complaint submitted by citizen',
        changed_by: req.user.id,
        changed_by_name: user?.full_name || 'Citizen',
        changed_by_role: 'citizen',
        changed_at: createdAt,
      });

      return res.status(201).json({ report: { id, category, title, status: 'SUBMITTED', priority: assignedPriority, created_at: report.created_at } });
    }

    const result = await db.query(
      `INSERT INTO reports (user_id, category, title, description, location, address_text, ward_number, status, priority)
       VALUES ($1, $2, $3, $4, ST_GeogFromText('SRID=4326;POINT(' || $6 || ' ' || $5 || ')'), $7, $8, 'SUBMITTED', $9)
       RETURNING id, category, title, status, priority, created_at`,
      [req.user.id, category, title, description, parseFloat(lat), parseFloat(lng), address_text, ward_number || null, assignedPriority]
    );
    const report = result.rows[0];

    // Find reporter name for audit history
    const userResult = await db.query('SELECT full_name FROM users WHERE id = $1', [req.user.id]);
    const reporterName = userResult.rows[0]?.full_name || 'Citizen';

    await db.query(
      `INSERT INTO report_status_history (report_id, old_status, new_status, remark, changed_by, changed_by_name, changed_by_role, changed_at)
       VALUES ($1, NULL, 'SUBMITTED', 'Complaint submitted by citizen', $2, $3, 'citizen', NOW())`,
      [report.id, req.user.id, reporterName]
    );

    res.status(201).json({ report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create report.' });
  }
});

// ── PATCH /api/reports/:id/priority ──────────────────────────────────────────
router.patch('/:id/priority', authMiddleware, requireRole(['admin', 'government']), async (req, res) => {
  const { priority, remark } = req.body;
  if (!priority) {
    return res.status(400).json({ error: 'Priority is required.' });
  }
  const targetPriority = String(priority).toUpperCase();
  if (!VALID_PRIORITIES.includes(targetPriority)) {
    return res.status(400).json({
      error: `Invalid priority '${priority}'. Priority must be one of: ${VALID_PRIORITIES.join(', ')}`,
    });
  }

  try {
    // 1. In-memory mode
    if (db.isInMemory) {
      const report = db.store.reports.find(r => r.id == req.params.id);
      if (!report) return res.status(404).json({ error: 'Report not found.' });

      const oldPriority = report.priority || 'MEDIUM';
      report.priority = targetPriority;
      report.updated_at = new Date().toISOString();

      const user = db.store.users.find(u => u.id === req.user.id);
      const auditRemark = `Priority changed from ${oldPriority} to ${targetPriority}${remark ? ': ' + remark : ''}`;
      const historyEntry = {
        id: ++db.store.nextId,
        report_id: report.id,
        old_status: normalizeStatus(report.status),
        new_status: normalizeStatus(report.status),
        remark: auditRemark,
        changed_by: req.user.id,
        changed_by_name: user?.full_name || 'Official',
        changed_by_role: req.user.role,
        changed_at: new Date().toISOString(),
      };
      if (!db.store.report_status_history) db.store.report_status_history = [];
      db.store.report_status_history.push(historyEntry);

      return res.json({
        report: {
          id: report.id,
          priority: targetPriority,
          status: report.status,
          updated_at: report.updated_at,
        },
        history_entry: historyEntry,
      });
    }

    // 2. PostgreSQL mode
    const currentRes = await db.query('SELECT status, priority FROM reports WHERE id = $1', [req.params.id]);
    if (!currentRes.rows.length) return res.status(404).json({ error: 'Report not found.' });

    const currentStatus = normalizeStatus(currentRes.rows[0].status);
    const oldPriority = currentRes.rows[0].priority || 'MEDIUM';

    const updateRes = await db.query(
      `UPDATE reports SET priority = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status, priority, updated_at`,
      [targetPriority, req.params.id]
    );

    const userRes = await db.query('SELECT full_name FROM users WHERE id = $1', [req.user.id]);
    const changerName = userRes.rows[0]?.full_name || 'Official';
    const auditRemark = `Priority changed from ${oldPriority} to ${targetPriority}${remark ? ': ' + remark : ''}`;

    const historyRes = await db.query(
      `INSERT INTO report_status_history (report_id, old_status, new_status, remark, changed_by, changed_by_name, changed_by_role, changed_at)
       VALUES ($1, $2, $2, $3, $4, $5, $6, NOW())
       RETURNING id, old_status, new_status, remark, changed_by_role, changed_at`,
      [req.params.id, currentStatus, auditRemark, req.user.id, changerName, req.user.role]
    );

    res.json({
      report: updateRes.rows[0],
      history_entry: historyRes.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update priority.' });
  }
});

// ── PATCH /api/reports/:id/status ─────────────────────────────────────────────
router.patch('/:id/status', authMiddleware, requireRole(['admin', 'government']), async (req, res) => {
  const { status, remark, assigned_to, after_photo_url } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status is required.' });
  }
  const targetStatus = normalizeStatus(status);
  if (!VALID_WORKFLOW_STATUSES.includes(targetStatus)) {
    return res.status(400).json({
      error: `Invalid status '${status}'. Status must be one of: ${VALID_WORKFLOW_STATUSES.join(', ')}`,
    });
  }

  try {
    // 1. In-memory mode
    if (db.isInMemory) {
      const report = db.store.reports.find(r => r.id == req.params.id);
      if (!report) return res.status(404).json({ error: 'Report not found.' });

      const currentStatus = normalizeStatus(report.status);
      const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
      if (!allowedTransitions.includes(targetStatus)) {
        return res.status(400).json({
          error: `Invalid status transition from ${currentStatus} to ${targetStatus}. Allowed transitions: ${allowedTransitions.join(', ') || 'None'}`,
        });
      }

      report.status = targetStatus;
      if (assigned_to !== undefined) report.assigned_to = assigned_to;
      if (after_photo_url !== undefined) report.after_photo_url = after_photo_url;
      if (targetStatus === 'RESOLVED') report.resolved_at = new Date().toISOString();
      report.updated_at = new Date().toISOString();

      const user = db.store.users.find(u => u.id === req.user.id);
      const historyEntry = {
        id: ++db.store.nextId,
        report_id: report.id,
        old_status: currentStatus,
        new_status: targetStatus,
        remark: remark || null,
        changed_by: req.user.id,
        changed_by_name: user?.full_name || 'Official',
        changed_by_role: req.user.role,
        changed_at: new Date().toISOString(),
      };
      if (!db.store.report_status_history) db.store.report_status_history = [];
      db.store.report_status_history.push(historyEntry);

      return res.json({
        report: {
          id: report.id,
          status: targetStatus,
          assigned_to: report.assigned_to,
          after_photo_url: report.after_photo_url,
          resolved_at: report.resolved_at,
        },
        history_entry: {
          old_status: currentStatus,
          new_status: targetStatus,
          remark: remark || null,
          changed_by_role: req.user.role,
          changed_at: historyEntry.changed_at,
        },
      });
    }

    // 2. PostgreSQL mode
    const currentRes = await db.query('SELECT status, assigned_to FROM reports WHERE id = $1', [req.params.id]);
    if (!currentRes.rows.length) return res.status(404).json({ error: 'Report not found.' });

    const currentStatus = normalizeStatus(currentRes.rows[0].status);
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowedTransitions.includes(targetStatus)) {
      return res.status(400).json({
        error: `Invalid status transition from ${currentStatus} to ${targetStatus}. Allowed transitions: ${allowedTransitions.join(', ') || 'None'}`,
      });
    }

    const updateRes = await db.query(
      `UPDATE reports SET 
         status = $1,
         assigned_to = COALESCE($2, assigned_to),
         after_photo_url = COALESCE($3, after_photo_url),
         resolved_at = CASE WHEN $1 = 'RESOLVED' THEN NOW() ELSE resolved_at END,
         resolved_by = CASE WHEN $1 = 'RESOLVED' THEN $4 ELSE resolved_by END,
         updated_at = NOW()
       WHERE id = $5 
       RETURNING id, status, assigned_to, after_photo_url, resolved_at`,
      [targetStatus, assigned_to || null, after_photo_url || null, req.user.id, req.params.id]
    );

    const userRes = await db.query('SELECT full_name FROM users WHERE id = $1', [req.user.id]);
    const changerName = userRes.rows[0]?.full_name || 'Official';

    const historyRes = await db.query(
      `INSERT INTO report_status_history (report_id, old_status, new_status, remark, changed_by, changed_by_name, changed_by_role, changed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, old_status, new_status, remark, changed_by_role, changed_at`,
      [req.params.id, currentStatus, targetStatus, remark || null, req.user.id, changerName, req.user.role]
    );

    res.json({
      report: updateRes.rows[0],
      history_entry: historyRes.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update status.' });
  }
});

// ── PATCH /api/reports/:id/resolve ────────────────────────────────────────────
router.patch('/:id/resolve', authMiddleware, requireRole(['government', 'admin']), async (req, res) => {
  const { after_photo_url, remark } = req.body;
  if (!after_photo_url) return res.status(400).json({ error: 'after_photo_url is required.' });
  try {
    if (db.isInMemory) {
      const report = db.store.reports.find(r => r.id == req.params.id);
      if (!report) return res.status(404).json({ error: 'Report not found.' });
      const currentStatus = normalizeStatus(report.status);
      report.status = 'RESOLVED';
      report.after_photo_url = after_photo_url;
      report.resolved_by = req.user.id;
      report.resolved_at = new Date().toISOString();
      report.updated_at = new Date().toISOString();

      if (!db.store.report_status_history) db.store.report_status_history = [];
      db.store.report_status_history.push({
        id: ++db.store.nextId,
        report_id: report.id,
        old_status: currentStatus,
        new_status: 'RESOLVED',
        remark: remark || 'Issue resolved with photographic proof',
        changed_by: req.user.id,
        changed_by_name: 'Official',
        changed_by_role: req.user.role,
        changed_at: new Date().toISOString(),
      });

      return res.json({ report });
    }

    const currentRes = await db.query('SELECT status FROM reports WHERE id = $1', [req.params.id]);
    if (!currentRes.rows.length) return res.status(404).json({ error: 'Report not found.' });
    const currentStatus = normalizeStatus(currentRes.rows[0].status);

    const result = await db.query(
      `UPDATE reports SET status = 'RESOLVED', after_photo_url = $1, resolved_by = $2, resolved_at = NOW(), updated_at = NOW()
       WHERE id = $3 RETURNING id, status, after_photo_url, resolved_by, resolved_at`,
      [after_photo_url, req.user.id, req.params.id]
    );

    const userRes = await db.query('SELECT full_name FROM users WHERE id = $1', [req.user.id]);
    const changerName = userRes.rows[0]?.full_name || 'Official';

    await db.query(
      `INSERT INTO report_status_history (report_id, old_status, new_status, remark, changed_by, changed_by_name, changed_by_role, changed_at)
       VALUES ($1, $2, 'RESOLVED', $3, $4, $5, $6, NOW())`,
      [req.params.id, currentStatus, remark || 'Issue resolved with photographic proof', req.user.id, changerName, req.user.role]
    );

    res.json({ report: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to resolve report.' });
  }
});

// ── GET /api/reports/:id/comments ─────────────────────────────────────────────
router.get('/:id/comments', async (req, res) => {
  try {
    if (db.isInMemory) {
      const comments = db.store.report_comments.filter(c => c.report_id == req.params.id);
      return res.json({ comments });
    }
    const result = await db.query(
      `SELECT c.*, u.full_name AS author_name FROM report_comments c
       LEFT JOIN users u ON c.user_id = u.id WHERE c.report_id = $1 ORDER BY c.created_at ASC`,
      [req.params.id]
    );
    res.json({ comments: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch comments.' });
  }
});

// ── POST /api/reports/:id/comments ────────────────────────────────────────────
router.post('/:id/comments', authMiddleware, async (req, res) => {
  const { body } = req.body;
  if (!body) return res.status(400).json({ error: 'body is required.' });
  try {
    if (db.isInMemory) {
      const id = ++db.store.nextId;
      const user = db.store.users.find(u => u.id === req.user.id);
      const comment = { id, report_id: req.params.id, user_id: req.user.id, body, author_name: user?.full_name || 'Citizen', created_at: new Date().toISOString() };
      db.store.report_comments.push(comment);
      return res.status(201).json({ comment });
    }
    const result = await db.query(
      `INSERT INTO report_comments (report_id, user_id, body) VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, req.user.id, body]
    );
    res.status(201).json({ comment: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add comment.' });
  }
});

// ── POST /api/reports/:id/like ────────────────────────────────────────────────
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    if (db.isInMemory) {
      const report = db.store.reports.find(r => r.id == req.params.id);
      if (!report) return res.status(404).json({ error: 'Report not found.' });
      if (report.status !== 'resolved') return res.status(400).json({ error: 'Can only like resolved reports.' });
      report.upvotes = (report.upvotes || 0) + 1;
      return res.json({ id: report.id, upvotes: report.upvotes });
    }
    const reportRes = await db.query('SELECT status FROM reports WHERE id = $1', [req.params.id]);
    if (!reportRes.rows.length) return res.status(404).json({ error: 'Report not found.' });
    if (reportRes.rows[0].status !== 'resolved') return res.status(400).json({ error: 'Can only like resolved reports.' });
    await db.query('INSERT INTO report_likes (report_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.params.id, req.user.id]);
    const result = await db.query('UPDATE reports SET upvotes = upvotes + 1 WHERE id = $1 RETURNING id, upvotes', [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to like.' });
  }
});

// Supportable statuses - only these statuses can receive support
const SUPPORTABLE_STATUSES = ['IN_PROGRESS', 'RESOLVED'];

// ── POST /api/reports/:id/support ───────────────────────────────────────────────
// Add a support (upvote) for a complaint
router.post('/:id/support', authMiddleware, async (req, res) => {
  const reportId = req.params.id;

  try {
    if (db.isInMemory) {
      const report = db.store.reports.find(r => r.id == reportId);
      if (!report) return res.status(404).json({ error: 'Report not found.' });

      const currentStatus = normalizeStatus(report.status);
      if (!SUPPORTABLE_STATUSES.includes(currentStatus)) {
        return res.status(400).json({ error: 'This complaint is not yet supportable.' });
      }

      if (!db.store.report_likes) db.store.report_likes = [];
      const existing = db.store.report_likes.find(
        l => l.report_id == reportId && l.user_id === req.user.id
      );
      if (existing) {
        return res.status(409).json({ error: 'Already supported this complaint.' });
      }

      db.store.report_likes.push({ report_id: reportId, user_id: req.user.id });
      // Recalculate upvotes from likes array
      report.upvotes = db.store.report_likes.filter(l => l.report_id == reportId).length;
      return res.status(201).json({ support_count: report.upvotes, user_supported: true });
    }

    // PostgreSQL
    const reportRes = await db.query('SELECT id, status FROM reports WHERE id = $1', [reportId]);
    if (!reportRes.rows.length) return res.status(404).json({ error: 'Report not found.' });

    const currentStatus = normalizeStatus(reportRes.rows[0].status);
    if (!SUPPORTABLE_STATUSES.includes(currentStatus)) {
      return res.status(400).json({ error: 'This complaint is not yet supportable.' });
    }

    const likeRes = await db.query(
      'INSERT INTO report_likes (report_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING report_id',
      [reportId, req.user.id]
    );

    if (likeRes.rowCount === 0) {
      return res.status(409).json({ error: 'Already supported this complaint.' });
    }

    await db.query('UPDATE reports SET upvotes = upvotes + 1 WHERE id = $1', [reportId]);

    const countRes = await db.query('SELECT COUNT(*) FROM report_likes WHERE report_id = $1', [reportId]);
    return res.status(201).json({ support_count: parseInt(countRes.rows[0].count), user_supported: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add support.' });
  }
});

// ── DELETE /api/reports/:id/support ─────────────────────────────────────────────
// Remove a support (upvote) for a complaint
router.delete('/:id/support', authMiddleware, async (req, res) => {
  const reportId = req.params.id;

  try {
    if (db.isInMemory) {
      const report = db.store.reports.find(r => r.id == reportId);
      if (!report) return res.status(404).json({ error: 'Report not found.' });

      if (!db.store.report_likes) db.store.report_likes = [];
      const likeIndex = db.store.report_likes.findIndex(
        l => l.report_id == reportId && l.user_id === req.user.id
      );
      if (likeIndex === -1) {
        return res.status(404).json({ error: 'Support not found.' });
      }

      db.store.report_likes.splice(likeIndex, 1);
      // Recalculate upvotes from likes array
      report.upvotes = db.store.report_likes.filter(l => l.report_id == reportId).length;
      return res.json({ support_count: report.upvotes, user_supported: false });
    }

    // PostgreSQL
    const reportRes = await db.query('SELECT id FROM reports WHERE id = $1', [reportId]);
    if (!reportRes.rows.length) return res.status(404).json({ error: 'Report not found.' });

    const likeRes = await db.query(
      'DELETE FROM report_likes WHERE report_id = $1 AND user_id = $2 RETURNING report_id',
      [reportId, req.user.id]
    );

    if (likeRes.rowCount === 0) {
      return res.status(404).json({ error: 'Support not found.' });
    }

    await db.query('UPDATE reports SET upvotes = GREATEST(0, upvotes - 1) WHERE id = $1', [reportId]);

    const countRes = await db.query('SELECT COUNT(*) FROM report_likes WHERE report_id = $1', [reportId]);
    return res.json({ support_count: parseInt(countRes.rows[0].count), user_supported: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove support.' });
  }
});

// ── GET /api/reports/:id/support ────────────────────────────────────────────────
// Get support count and whether current user has supported
router.get('/:id/support', authMiddleware, async (req, res) => {
  const reportId = req.params.id;

  try {
    if (db.isInMemory) {
      const report = db.store.reports.find(r => r.id == reportId);
      if (!report) return res.status(404).json({ error: 'Report not found.' });

      const supported = db.store.report_likes?.some(
        l => l.report_id == reportId && l.user_id === req.user.id
      ) || false;

      // Calculate support count from likes array
      const supportCount = db.store.report_likes?.filter(l => l.report_id == reportId).length || 0;
      return res.json({ support_count: supportCount, user_supported: supported });
    }

    // PostgreSQL
    const reportRes = await db.query('SELECT id FROM reports WHERE id = $1', [reportId]);
    if (!reportRes.rows.length) return res.status(404).json({ error: 'Report not found.' });

    const [countRes, likeRes] = await Promise.all([
      db.query('SELECT COUNT(*) FROM report_likes WHERE report_id = $1', [reportId]),
      db.query('SELECT 1 FROM report_likes WHERE report_id = $1 AND user_id = $2', [reportId, req.user.id]),
    ]);

    const supportCount = parseInt(countRes.rows[0].count);
    const userSupported = likeRes.rowCount > 0;

    return res.json({ support_count: supportCount, user_supported: userSupported });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch support info.' });
  }
});

module.exports = router;
