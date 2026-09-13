const express = require('express');
const db = require('../models/db');
const { authMiddleware, requireVerified } = require('../middleware/authMiddleware');

const router = express.Router();

// ── GET /api/forum?ward=73 ────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { ward, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    if (db.isInMemory) {
      let posts = db.store.forum_posts.filter(p => !p.parent_id && !p.is_deleted);
      if (ward) posts = posts.filter(p => p.ward_number === parseInt(ward));
      posts.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0) || new Date(b.created_at) - new Date(a.created_at));
      return res.json({ posts: posts.slice(offset, offset + parseInt(limit)) });
    }
    const result = await db.query(
      `SELECT p.id, p.title, p.body, p.upvotes, p.is_pinned, p.created_at, p.ward_number,
         u.full_name AS author_name,
         (SELECT COUNT(*) FROM forum_posts r WHERE r.parent_id = p.id) AS reply_count
       FROM forum_posts p LEFT JOIN users u ON p.user_id = u.id
       WHERE p.parent_id IS NULL AND p.is_deleted = FALSE ${ward ? 'AND p.ward_number = $3' : ''}
       ORDER BY p.is_pinned DESC, p.created_at DESC LIMIT $1 OFFSET $2`,
      ward ? [parseInt(limit), offset, parseInt(ward)] : [parseInt(limit), offset]
    );
    res.json({ posts: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch forum posts.' });
  }
});

// ── GET /api/forum/:id/replies ────────────────────────────────────────────────
router.get('/:id/replies', async (req, res) => {
  try {
    if (db.isInMemory) {
      const replies = db.store.forum_posts.filter(p => p.parent_id == req.params.id && !p.is_deleted);
      return res.json({ replies });
    }
    const result = await db.query(
      `SELECT p.*, u.full_name AS author_name FROM forum_posts p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.parent_id = $1 AND p.is_deleted = FALSE ORDER BY p.created_at ASC`, [req.params.id]
    );
    res.json({ replies: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch replies.' });
  }
});

// ── POST /api/forum ───────────────────────────────────────────────────────────
router.post('/', authMiddleware, requireVerified, async (req, res) => {
  const { title, body, ward_number, parent_id } = req.body;
  if (!body) return res.status(400).json({ error: 'Post body is required.' });
  try {
    if (db.isInMemory) {
      const id = ++db.store.nextId;
      const user = db.store.users.find(u => u.id === req.user.id);
      const post = {
        id, user_id: req.user.id, title: title || null, body,
        ward_number: ward_number || null, parent_id: parent_id || null,
        upvotes: 0, is_pinned: false, is_deleted: false,
        author_name: user?.full_name || 'Citizen',
        reply_count: 0, created_at: new Date().toISOString(),
      };
      db.store.forum_posts.push(post);
      return res.status(201).json({ post: { id, title, body, ward_number, created_at: post.created_at } });
    }
    const result = await db.query(
      `INSERT INTO forum_posts (user_id, title, body, ward_number, parent_id) VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, body, ward_number, created_at`,
      [req.user.id, title || null, body, ward_number || null, parent_id || null]
    );
    res.status(201).json({ post: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create post.' });
  }
});

// ── POST /api/forum/:id/upvote ────────────────────────────────────────────────
router.post('/:id/upvote', authMiddleware, async (req, res) => {
  try {
    if (db.isInMemory) {
      const post = db.store.forum_posts.find(p => p.id == req.params.id);
      if (!post) return res.status(404).json({ error: 'Post not found.' });
      post.upvotes = (post.upvotes || 0) + 1;
      return res.json({ id: post.id, upvotes: post.upvotes });
    }
    const result = await db.query(
      'UPDATE forum_posts SET upvotes = upvotes + 1 WHERE id = $1 RETURNING id, upvotes', [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to upvote.' });
  }
});

module.exports = router;
