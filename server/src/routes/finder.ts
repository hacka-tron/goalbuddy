import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { query } from '../db';

const router = Router();

// GET /finder/deck?mode=specific&goalId=xxx  OR  ?mode=any
// Returns ranked candidate cards excluding already-swiped, connected, and self
router.get('/deck', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { mode, goalId } = req.query as { mode: string; goalId?: string };

  try {
    if (mode === 'specific' && !goalId) {
      res.status(400).json({ error: 'goalId required for specific mode' });
      return;
    }

    // Verify the goal belongs to this user (specific mode)
    if (mode === 'specific' && goalId) {
      const goalCheck = await query('SELECT id FROM goals WHERE id = $1 AND user_id = $2', [goalId, req.userId]);
      if (!goalCheck.rows[0]) { res.status(404).json({ error: 'Goal not found' }); return; }

      // Check if goal already has a buddy
      const buddyCheck = await query(
        `SELECT id FROM buddy_connections WHERE goal_id = $1 AND status = 'accepted'`,
        [goalId]
      );
      if (buddyCheck.rows[0]) {
        res.status(409).json({ error: 'This goal already has a buddy', locked: true });
        return;
      }
    }

    let candidates;

    if (mode === 'specific') {
      // Find users who have a public active goal in the same category
      candidates = await query(
        `SELECT
          u.id, u.display_name, u.username, u.avatar_url, u.bio,
          g.id AS goal_id, g.title AS goal_title, g.category,
          a.activity_level, a.current_streak, a.total_checkins, a.milestones_completed,
          (SELECT COUNT(*) FROM goals g2
           JOIN goals g3 ON g3.category = g2.category AND g3.user_id = $1 AND g3.status = 'active'
           WHERE g2.user_id = u.id AND g2.status = 'active' AND g2.is_public = TRUE) AS shared_goal_count
         FROM users u
         JOIN goals g ON g.user_id = u.id AND g.status = 'active' AND g.is_public = TRUE
         JOIN goals my_goal ON my_goal.id = $2 AND my_goal.category = g.category
         LEFT JOIN activity_stats a ON a.user_id = u.id
         WHERE u.id != $1
           AND u.id NOT IN (
             SELECT swiped_id FROM swipe_actions WHERE swiper_id = $1 AND goal_id = $2
           )
           AND u.id NOT IN (
             SELECT CASE WHEN requester_id = $1 THEN receiver_id ELSE requester_id END
             FROM buddy_connections
             WHERE (requester_id = $1 OR receiver_id = $1)
               AND goal_id = $2
               AND status IN ('pending','accepted')
           )
         ORDER BY a.activity_level DESC, shared_goal_count DESC
         LIMIT 50`,
        [req.userId, goalId]
      );
    } else {
      // mode = 'any': show users with any overlapping goal category
      candidates = await query(
        `SELECT
          u.id, u.display_name, u.username, u.avatar_url, u.bio,
          a.activity_level, a.current_streak, a.total_checkins, a.milestones_completed,
          COUNT(DISTINCT g2.category) AS shared_goal_count,
          ARRAY_AGG(DISTINCT g2.category) AS shared_categories,
          ARRAY_AGG(DISTINCT g_theirs.title ORDER BY g_theirs.title) AS their_goal_titles
         FROM users u
         JOIN goals g_theirs ON g_theirs.user_id = u.id AND g_theirs.status = 'active' AND g_theirs.is_public = TRUE
         JOIN goals g2 ON g2.category = g_theirs.category AND g2.user_id = $1 AND g2.status = 'active'
         LEFT JOIN activity_stats a ON a.user_id = u.id
         WHERE u.id != $1
           AND u.id NOT IN (
             SELECT swiped_id FROM swipe_actions
             WHERE swiper_id = $1 AND mode = 'any'
           )
           AND u.id NOT IN (
             SELECT CASE WHEN requester_id = $1 THEN receiver_id ELSE requester_id END
             FROM buddy_connections
             WHERE (requester_id = $1 OR receiver_id = $1) AND status IN ('pending','accepted')
           )
         GROUP BY u.id, u.display_name, u.username, u.avatar_url, u.bio,
                  a.activity_level, a.current_streak, a.total_checkins, a.milestones_completed
         ORDER BY shared_goal_count DESC, a.total_checkins DESC
         LIMIT 50`,
        [req.userId]
      );
    }

    res.json(candidates.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /finder/swipe
router.post('/swipe', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { swipedId, action, mode, goalId } = req.body;
  if (!swipedId || !action || !mode) {
    res.status(400).json({ error: 'swipedId, action, and mode required' });
    return;
  }

  try {
    await query(
      `INSERT INTO swipe_actions (swiper_id, swiped_id, action, mode, goal_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (swiper_id, swiped_id, goal_id) DO NOTHING`,
      [req.userId, swipedId, action, mode, goalId || null]
    );

    // Check if a new connection was created by the trigger
    const connectionResult = await query(
      `SELECT bc.*, u.display_name, u.avatar_url
       FROM buddy_connections bc
       JOIN users u ON u.id = CASE WHEN bc.requester_id = $1 THEN bc.receiver_id ELSE bc.requester_id END
       WHERE (bc.requester_id = $1 OR bc.receiver_id = $1)
         AND (bc.requester_id = $2 OR bc.receiver_id = $2)
         AND bc.status = 'pending'
       ORDER BY bc.created_at DESC
       LIMIT 1`,
      [req.userId, swipedId]
    );

    res.json({
      success: true,
      matched: connectionResult.rows.length > 0,
      connection: connectionResult.rows[0] || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
