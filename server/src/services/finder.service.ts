import { query } from '../db';
import { ServiceError } from '../lib/errors';

export class FinderService {
  static async getDeck(userId: string, goalId: string) {
    const goalCheck = await query('SELECT id FROM goals WHERE id = $1 AND user_id = $2', [goalId, userId]);
    if (!goalCheck.rows[0]) {
      throw new ServiceError('Goal not found', 404, 'NOT_FOUND');
    }

    const buddyCheck = await query(
      `SELECT id FROM buddy_connections WHERE goal_id = $1 AND status = 'accepted'`,
      [goalId]
    );
    if (buddyCheck.rows[0]) {
      throw new ServiceError('This goal already has a buddy', 409, 'CONFLICT');
    }

    const result = await query(
      `SELECT * FROM (
        SELECT DISTINCT ON (u.id)
          u.id, u.display_name, u.username, u.avatar_url, u.bio,
          g.id AS goal_id, g.title AS goal_title, g.category,
          a.activity_level, a.current_streak, a.total_checkins, a.milestones_completed,
          (SELECT COUNT(*) FROM goals g2
           JOIN goals g3 ON g3.category = g2.category AND g3.user_id = $1 AND g3.status = 'active'
           WHERE g2.user_id = u.id AND g2.status = 'active' AND g2.is_public = TRUE) AS shared_goal_count
        FROM users u
        JOIN goals g ON g.user_id = u.id AND g.status = 'active' AND g.is_public = TRUE
          AND NOT EXISTS (
            SELECT 1 FROM buddy_connections bc2
            WHERE bc2.goal_id = g.id AND bc2.status = 'accepted'
          )
        JOIN goals my_goal ON my_goal.id = $2 AND my_goal.category = g.category
        LEFT JOIN activity_stats a ON a.user_id = u.id
        WHERE u.id != $1
          AND u.id NOT IN (
            SELECT CASE WHEN requester_id = $1 THEN receiver_id ELSE requester_id END
            FROM buddy_connections
            WHERE (requester_id = $1 OR receiver_id = $1)
              AND (goal_id = $2 OR receiver_goal_id = $2)
              AND status IN ('pending','accepted')
          )
          AND NOT EXISTS (
            SELECT 1 FROM swipe_actions sa
            WHERE sa.swiper_id = $1
              AND sa.swiped_id = u.id
              AND sa.goal_id = $2
          )
        ORDER BY u.id, a.activity_level DESC NULLS LAST
      ) sub
      ORDER BY activity_level DESC NULLS LAST, shared_goal_count DESC
      LIMIT 50`,
      [userId, goalId]
    );

    return result.rows;
  }

  static async recordSwipe(userId: string, swipedId: string, action: string, goalId: string, cardGoalId?: string) {
    await query(
      `INSERT INTO swipe_actions (swiper_id, swiped_id, action, mode, goal_id)
       SELECT $1, $2, $3, 'specific', $4
       WHERE NOT EXISTS (
         SELECT 1 FROM swipe_actions WHERE swiper_id = $1 AND swiped_id = $2 AND goal_id = $4
       )`,
      [userId, swipedId, action, goalId]
    );

    let matched = false;
    let connection = null;

    if (action === 'like') {
      // Auto-swipe back for @test.com users
      const userCheck = await query(`SELECT email FROM users WHERE id = $1`, [swipedId]);
      const swipedEmail: string = userCheck.rows[0]?.email || '';
      if (swipedEmail.includes('@test.com') && cardGoalId) {
        await query(
          `INSERT INTO swipe_actions (swiper_id, swiped_id, action, mode, goal_id)
           SELECT $1, $2, 'like', 'specific', $3
           WHERE NOT EXISTS (
             SELECT 1 FROM swipe_actions WHERE swiper_id = $1 AND swiped_id = $2 AND goal_id = $3
           )`,
          [swipedId, userId, cardGoalId]
        );
      }

      // Check for mutual like
      const reverseSwipe = await query(
        `SELECT goal_id FROM swipe_actions
         WHERE swiper_id = $1 AND swiped_id = $2 AND action = 'like'
         LIMIT 1`,
        [swipedId, userId]
      );

      if (reverseSwipe.rows[0]) {
        const theirGoalId = reverseSwipe.rows[0].goal_id;
        const conn = await query(
          `INSERT INTO buddy_connections (requester_id, receiver_id, goal_id, receiver_goal_id, status, accepted_at)
           VALUES ($1, $2, $3, $4, 'accepted', NOW())
           ON CONFLICT (requester_id, receiver_id, goal_id) DO NOTHING
           RETURNING *`,
          [swipedId, userId, theirGoalId, goalId]
        );
        if (conn.rows[0]) {
          matched = true;
          connection = conn.rows[0];
        }
      }
    }

    return { matched, connection };
  }
}
