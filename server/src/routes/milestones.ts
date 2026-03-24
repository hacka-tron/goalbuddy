import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { query } from '../db';

const router = Router();

// GET /milestones/feed  — communal feed: all completed milestones from me + buddies, newest first
router.get('/feed', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT m.id, m.title, m.completed_at, m.goal_id,
              g.title AS goal_title, g.category AS goal_category,
              u.id AS author_id, u.display_name, u.avatar_url,
              (u.id = $1) AS is_me
       FROM milestones m
       JOIN goals g ON g.id = m.goal_id
       JOIN users u ON u.id = m.user_id
       WHERE m.completed_at IS NOT NULL
         AND (
           m.user_id = $1
           OR EXISTS (
             SELECT 1 FROM buddy_connections bc
             WHERE bc.goal_id = g.id
               AND bc.status = 'accepted'
               AND (bc.requester_id = $1 OR bc.receiver_id = $1)
           )
         )
       ORDER BY m.completed_at DESC
       LIMIT 50`,
      [req.userId]
    );
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// GET /milestones/me  — all my milestones with is_done_this_period
router.get('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT m.*, g.title AS goal_title, g.category AS goal_category,
         CASE
           WHEN m.frequency = 'once' THEN (m.completed_at IS NOT NULL)
           WHEN m.frequency = 'daily' THEN EXISTS (
             SELECT 1 FROM milestone_logs ml WHERE ml.milestone_id = m.id AND ml.user_id = $1 AND ml.period_start = CURRENT_DATE
           )
           WHEN m.frequency = 'weekly' THEN EXISTS (
             SELECT 1 FROM milestone_logs ml WHERE ml.milestone_id = m.id AND ml.user_id = $1 AND ml.period_start = date_trunc('week', CURRENT_DATE)::date
           )
           WHEN m.frequency = 'monthly' THEN EXISTS (
             SELECT 1 FROM milestone_logs ml WHERE ml.milestone_id = m.id AND ml.user_id = $1 AND ml.period_start = date_trunc('month', CURRENT_DATE)::date
           )
           ELSE FALSE
         END AS is_done_this_period
       FROM milestones m
       JOIN goals g ON g.id = m.goal_id
       WHERE m.user_id = $1
       ORDER BY m.created_at ASC`,
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

// GET /milestones/goal/:goalId  — milestones for a specific goal with is_done_this_period
router.get('/goal/:goalId', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT
         m.*,
         u.display_name,
         u.avatar_url,
         CASE
           WHEN m.frequency = 'once' THEN (m.completed_at IS NOT NULL)
           WHEN m.frequency = 'daily' THEN EXISTS (
             SELECT 1 FROM milestone_logs ml
             WHERE ml.milestone_id = m.id
               AND ml.user_id = $2
               AND ml.period_start = CURRENT_DATE
           )
           WHEN m.frequency = 'weekly' THEN EXISTS (
             SELECT 1 FROM milestone_logs ml
             WHERE ml.milestone_id = m.id
               AND ml.user_id = $2
               AND ml.period_start = date_trunc('week', CURRENT_DATE)::date
           )
           WHEN m.frequency = 'monthly' THEN EXISTS (
             SELECT 1 FROM milestone_logs ml
             WHERE ml.milestone_id = m.id
               AND ml.user_id = $2
               AND ml.period_start = date_trunc('month', CURRENT_DATE)::date
           )
           ELSE FALSE
         END AS is_done_this_period
       FROM milestones m
       JOIN users u ON u.id = m.user_id
       WHERE m.goal_id = $1
       ORDER BY m.due_date ASC`,
      [req.params.goalId, req.userId]
    );
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// POST /milestones/goal/:goalId/log  — log completion for current period of a recurring milestone
router.post('/goal/:goalId/log', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { milestoneId, note } = req.body;
  if (!milestoneId) { res.status(400).json({ error: 'milestoneId required' }); return; }
  try {
    // Get the milestone frequency
    const milestoneResult = await query(
      `SELECT id, frequency FROM milestones WHERE id = $1 AND goal_id = $2`,
      [milestoneId, req.params.goalId]
    );
    if (!milestoneResult.rows[0]) { res.status(404).json({ error: 'Milestone not found' }); return; }

    const { frequency } = milestoneResult.rows[0];

    let periodStart: string;
    switch (frequency) {
      case 'daily':
        periodStart = 'CURRENT_DATE';
        break;
      case 'weekly':
        periodStart = `date_trunc('week', CURRENT_DATE)::date`;
        break;
      case 'monthly':
        periodStart = `date_trunc('month', CURRENT_DATE)::date`;
        break;
      default:
        res.status(400).json({ error: 'Use PATCH /milestones/:id for once-type milestones' }); return;
    }

    const result = await query(
      `INSERT INTO milestone_logs (milestone_id, user_id, period_start, note)
       SELECT $1, $2, ${periodStart}, $3
       WHERE NOT EXISTS (
         SELECT 1 FROM milestone_logs
         WHERE milestone_id = $1 AND user_id = $2 AND period_start = ${periodStart}
       )
       RETURNING *`,
      [milestoneId, req.userId, note || null]
    );

    res.status(201).json({ logged: (result.rowCount ?? 0) > 0, row: result.rows[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /milestones
router.post('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { goalId, title, description, dueDate, aiSuggested, frequency } = req.body;
  if (!goalId || !title) { res.status(400).json({ error: 'goalId and title required' }); return; }
  try {
    const result = await query(
      `INSERT INTO milestones (goal_id, user_id, title, description, due_date, ai_suggested, frequency)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [goalId, req.userId, title, description || null, dueDate || null, aiSuggested || false, frequency || 'once']
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
