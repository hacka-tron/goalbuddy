import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { query } from '../db';

const router = Router();

// GET /goals  — my goals with buddy status per goal
router.get('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT g.*,
        bc.id AS connection_id,
        bc.status AS connection_status,
        CASE WHEN bc.requester_id = $1 THEN bc.receiver_id ELSE bc.requester_id END AS buddy_id,
        u.display_name AS buddy_name,
        u.avatar_url AS buddy_avatar,
        a.activity_level AS buddy_activity_level
       FROM goals g
       LEFT JOIN buddy_connections bc ON bc.goal_id = g.id AND bc.status = 'accepted'
       LEFT JOIN users u ON u.id = CASE WHEN bc.requester_id = $1 THEN bc.receiver_id ELSE bc.requester_id END
       LEFT JOIN activity_stats a ON a.user_id = u.id
       WHERE g.user_id = $1
       ORDER BY g.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// POST /goals
router.post('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, category, description, targetDate, isPublic } = req.body;
  if (!title || !category) { res.status(400).json({ error: 'title and category required' }); return; }
  try {
    const result = await query(
      `INSERT INTO goals (user_id, title, category, description, target_date, is_public)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.userId, title, category, description || null, targetDate || null, isPublic !== false]
    );
    res.status(201).json(result.rows[0]);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// PATCH /goals/:id
router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, description, targetDate, status, isPublic } = req.body;
  try {
    const result = await query(
      `UPDATE goals SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        target_date = COALESCE($3, target_date),
        status = COALESCE($4, status),
        is_public = COALESCE($5, is_public),
        updated_at = NOW()
       WHERE id = $6 AND user_id = $7 RETURNING *`,
      [title, description, targetDate, status, isPublic, req.params.id, req.userId]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'Goal not found' }); return; }
    res.json(result.rows[0]);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// DELETE /goals/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await query('DELETE FROM goals WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.status(204).send();
  } catch { res.status(500).json({ error: 'Server error' }); }
});

export default router;
