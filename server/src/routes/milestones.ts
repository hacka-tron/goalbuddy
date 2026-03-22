import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { query } from '../db';

const router = Router();

// GET /milestones/me  — all my milestones
router.get('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT m.*, g.title AS goal_title, g.category AS goal_category
       FROM milestones m
       JOIN goals g ON g.id = m.goal_id
       WHERE m.user_id = $1
       ORDER BY m.completed_at DESC NULLS LAST, m.due_date ASC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// GET /milestones/buddies  — buddies' completed milestones
router.get('/buddies', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT m.*, g.title AS goal_title, g.category AS goal_category,
              u.display_name, u.avatar_url
       FROM milestones m
       JOIN goals g ON g.id = m.goal_id
       JOIN users u ON u.id = m.user_id
       JOIN buddy_connections bc ON bc.goal_id = g.id
         AND (bc.requester_id = $1 OR bc.receiver_id = $1)
         AND bc.status = 'accepted'
       WHERE m.completed_at IS NOT NULL
         AND m.user_id != $1
       ORDER BY m.completed_at DESC
       LIMIT 30`,
      [req.userId]
    );
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// GET /milestones/goal/:goalId  — milestones for a specific goal
router.get('/goal/:goalId', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT m.*, u.display_name, u.avatar_url
       FROM milestones m
       JOIN users u ON u.id = m.user_id
       WHERE m.goal_id = $1
       ORDER BY m.due_date ASC`,
      [req.params.goalId]
    );
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// POST /milestones
router.post('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { goalId, title, description, dueDate, aiSuggested } = req.body;
  if (!goalId || !title) { res.status(400).json({ error: 'goalId and title required' }); return; }
  try {
    const result = await query(
      `INSERT INTO milestones (goal_id, user_id, title, description, due_date, ai_suggested)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [goalId, req.userId, title, description || null, dueDate || null, aiSuggested || false]
    );
    res.status(201).json(result.rows[0]);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// PATCH /milestones/:id  — mark complete or update
router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, description, dueDate, completed } = req.body;
  try {
    const result = await query(
      `UPDATE milestones SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        due_date = COALESCE($3, due_date),
        completed_at = CASE WHEN $4 = TRUE THEN NOW() WHEN $4 = FALSE THEN NULL ELSE completed_at END
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [title, description, dueDate, completed, req.params.id, req.userId]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'Milestone not found' }); return; }
    res.json(result.rows[0]);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

export default router;
