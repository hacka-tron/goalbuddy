import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { query } from '../db';

const router = Router();

// GET /buddies  — all my connections (pending + accepted)
router.get('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT
        bc.id, bc.status, bc.created_at, bc.accepted_at, bc.goal_id,
        bc.connection_type,
        g.title AS goal_title, g.category AS goal_category,
        u.id AS buddy_id, u.display_name AS buddy_name, u.avatar_url AS buddy_avatar,
        a.activity_level, a.current_streak, a.last_checkin_at,
        a.total_checkins, a.milestones_completed, a.response_rate,
        (bc.receiver_id = $1) AS is_incoming,
        (g.user_id = $1) AS is_my_goal,
        (
          SELECT author_id = $1
          FROM check_ins
          WHERE connection_id = bc.id
          ORDER BY created_at DESC LIMIT 1
        ) AS is_last_message_mine,
        (
          SELECT created_at
          FROM check_ins
          WHERE connection_id = bc.id
          ORDER BY created_at DESC LIMIT 1
        ) AS last_message_at,
        (
          SELECT COUNT(*)::int
          FROM milestones m
          WHERE m.goal_id = bc.goal_id
            AND m.user_id = u.id
            AND (
              -- One-time milestone: past its due date and not completed
              (
                m.frequency = 'once'
                AND m.due_date IS NOT NULL
                AND m.due_date < CURRENT_DATE
                AND m.completed_at IS NULL
              )
              OR
              -- Recurring milestone: existed before current period, no log for previous period
              (
                m.frequency != 'once'
                AND m.created_at::date < CASE
                  WHEN m.frequency = 'daily'   THEN CURRENT_DATE - 1
                  WHEN m.frequency = 'weekly'  THEN date_trunc('week', CURRENT_DATE - interval '7 days')::date
                  WHEN m.frequency = 'monthly' THEN date_trunc('month', CURRENT_DATE - interval '1 month')::date
                  ELSE CURRENT_DATE - 1
                END
                AND NOT EXISTS (
                  SELECT 1 FROM milestone_logs ml
                  WHERE ml.milestone_id = m.id
                    AND ml.user_id = u.id
                    AND ml.period_start = CASE
                      WHEN m.frequency = 'daily'
                        THEN CURRENT_DATE - 1
                      WHEN m.frequency = 'weekly'
                        THEN date_trunc('week', CURRENT_DATE - interval '7 days')::date
                      WHEN m.frequency = 'monthly'
                        THEN date_trunc('month', CURRENT_DATE - interval '1 month')::date
                      ELSE CURRENT_DATE - 1
                    END
                )
              )
            )
        ) AS overdue_count
       FROM buddy_connections bc
       JOIN goals g ON g.id = bc.goal_id
       JOIN users u ON u.id = CASE WHEN bc.requester_id = $1 THEN bc.receiver_id ELSE bc.requester_id END
       LEFT JOIN activity_stats a ON a.user_id = u.id
       WHERE (bc.requester_id = $1 OR bc.receiver_id = $1)
         AND bc.status IN ('pending', 'accepted')
       ORDER BY bc.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// POST /buddies/request
router.post('/request', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { goalId } = req.body;
  if (!goalId) { res.status(400).json({ error: 'goalId required' }); return; }
  try {
    const goalRes = await query(
      `SELECT user_id FROM goals WHERE id = $1 AND is_public = TRUE AND status = 'active'`,
      [goalId]
    );
    if (!goalRes.rows[0]) { res.status(404).json({ error: 'Goal not found' }); return; }
    const receiverId = goalRes.rows[0].user_id;
    if (receiverId === req.userId) { res.status(400).json({ error: 'Cannot request yourself' }); return; }

    const existing = await query(
      `SELECT status FROM buddy_connections WHERE goal_id = $1 AND status = 'accepted'`,
      [goalId]
    );
    if (existing.rows.length > 0) { res.status(409).json({ error: 'Goal already has a buddy' }); return; }

    const result = await query(
      `INSERT INTO buddy_connections (requester_id, receiver_id, goal_id, status)
       VALUES ($1, $2, $3, 'pending')
       ON CONFLICT (requester_id, receiver_id, goal_id) DO UPDATE SET status = 'pending'
       RETURNING *`,
      [req.userId, receiverId, goalId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /buddies/:id  — single connection detail
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT
        bc.id, bc.status, bc.created_at, bc.accepted_at, bc.goal_id,
        bc.requester_id, bc.receiver_id, bc.connection_type,
        g.title AS goal_title, g.category AS goal_category, g.description AS goal_description, g.target_date,
        u.id AS buddy_id, u.display_name AS buddy_name, u.avatar_url AS buddy_avatar, u.bio AS buddy_bio,
        a.activity_level, a.current_streak, a.total_checkins, a.milestones_completed,
        a.response_rate, a.last_checkin_at
       FROM buddy_connections bc
       JOIN goals g ON g.id = bc.goal_id
       JOIN users u ON u.id = CASE WHEN bc.requester_id = $1 THEN bc.receiver_id ELSE bc.requester_id END
       LEFT JOIN activity_stats a ON a.user_id = u.id
       WHERE bc.id = $2
         AND (bc.requester_id = $1 OR bc.receiver_id = $1)`,
      [req.userId, req.params.id]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'Connection not found' }); return; }
    res.json(result.rows[0]);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// PATCH /buddies/:id  — accept or decline
router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { status } = req.body;
  if (!['accepted', 'declined'].includes(status)) {
    res.status(400).json({ error: 'status must be accepted or declined' });
    return;
  }
  try {
    const result = await query(
      `UPDATE buddy_connections SET
        status = $1::connection_status,
        accepted_at = CASE WHEN $1::text = 'accepted' THEN NOW() ELSE NULL END
       WHERE id = $2
         AND (
           receiver_id = $3
           OR EXISTS (
             SELECT 1 FROM goals g
             JOIN buddy_connections bc ON bc.id = $2
             WHERE g.id = bc.goal_id AND g.user_id = $3
           )
         )
       RETURNING *`,
      [status, req.params.id, req.userId]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'Connection not found' }); return; }
    res.json(result.rows[0]);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    if (msg.includes('already has an accepted buddy')) {
      res.status(409).json({ error: 'This goal already has an accepted buddy' });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  }
});

export default router;
