import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { query } from '../db';

const router = Router();

// GET /finder/deck?goalId=xxx
router.get('/deck', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { goalId } = req.query as { goalId?: string };

  if (!goalId) {
    res.status(400).json({ error: 'goalId required' });
    return;
  }

  try {
    const goalCheck = await query('SELECT id FROM goals WHERE id = $1 AND user_id = $2', [goalId, req.userId]);
    if (!goalCheck.rows[0]) { res.status(404).json({ error: 'Goal not found' }); return; }

    const buddyCheck = await query(
      `SELECT id FROM buddy_connections WHERE goal_id = $1 AND status = 'accepted'`,
      [goalId]
    );
    if (buddyCheck.rows[0]) {
      res.status(409).json({ error: 'This goal already has a buddy', locked: true });
      return;
    }

    const result = await query(
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
           SELECT CASE WHEN requester_id = $1 THEN receiver_id ELSE requester_id END
           FROM buddy_connections
           WHERE (requester_id = $1 OR receiver_id = $1)
             AND goal_id = $2
             AND status IN ('pending','accepted')
         )
         AND NOT EXISTS (
           SELECT 1 FROM swipe_actions sa
           WHERE sa.swiper_id = $1
             AND sa.swiped_id = u.id
             AND sa.goal_id = $2
         )
       ORDER BY a.activity_level DESC, shared_goal_count DESC
       LIMIT 50`,
      [req.userId, goalId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /finder/swipe
router.post('/swipe', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { swipedId, action, goalId } = req.body;
  if (!swipedId || !action || !goalId) {
    res.status(400).json({ error: 'swipedId, action, and goalId required' });
    return;
  }

  try {
    // Persist swipe to DB using WHERE NOT EXISTS to handle partial index
    await query(
      `INSERT INTO swipe_actions (swiper_id, swiped_id, action, mode, goal_id)
       SELECT $1, $2, $3, 'specific', $4
       WHERE NOT EXISTS (
         SELECT 1 FROM swipe_actions WHERE swiper_id = $1 AND swiped_id = $2 AND goal_id = $4
       )`,
      [req.userId, swipedId, action, goalId]
    );

    let matched = false;
    let connection = null;

    if (action === 'like') {
      // Check if swiped user has a @test.com email — auto-swipe back
      const userCheck = await query(`SELECT email FROM users WHERE id = $1`, [swipedId]);
      const swipedEmail: string = userCheck.rows[0]?.email || '';

      if (swipedEmail.includes('@test.com')) {
        // Insert reverse swipe from the test user
        await query(
          `INSERT INTO swipe_actions (swiper_id, swiped_id, action, mode, goal_id)
           SELECT $1, $2, 'like', 'specific', $3
           WHERE NOT EXISTS (
             SELECT 1 FROM swipe_actions WHERE swiper_id = $1 AND swiped_id = $2 AND goal_id = $3
           )`,
          [swipedId, req.userId, goalId]
        );

        // Check for a resulting pending connection
        const connCheck = await query(
          `SELECT id FROM buddy_connections
           WHERE (requester_id = $1 OR receiver_id = $1)
             AND (requester_id = $2 OR receiver_id = $2)
             AND status = 'pending'`,
          [req.userId, swipedId]
        );
        if (connCheck.rows[0]) {
          matched = true;
          connection = connCheck.rows[0];
        }
      }
    }

    res.json({ success: true, matched, connection });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
