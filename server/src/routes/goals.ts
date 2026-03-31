import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { query } from '../db';

const router = Router();

// GET /goals/public  — search other users' public goals (for co-op discovery)
router.get('/public', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { q, category, buddyFilter } = req.query as { q?: string; category?: string; buddyFilter?: string };
  try {
    const result = await query(
      `SELECT g.id, g.title, g.category, g.description, g.target_date,
              g.coop_open,
              u.id AS user_id, u.display_name, u.username, u.avatar_url,
              a.activity_level, a.current_streak,
              COALESCE(ms.milestone_count, 0) AS milestone_count,
              EXISTS(
                SELECT 1 FROM buddy_connections bc
                WHERE bc.goal_id = g.id AND bc.status = 'accepted'
              ) AS has_buddy,
              (
                SELECT bc2.status FROM buddy_connections bc2
                WHERE bc2.goal_id = g.id AND bc2.requester_id = $1
                LIMIT 1
              ) AS my_request_status
       FROM goals g
       JOIN users u ON u.id = g.user_id
       LEFT JOIN activity_stats a ON a.user_id = u.id
       LEFT JOIN (SELECT goal_id, COUNT(*) AS milestone_count FROM milestones GROUP BY goal_id) ms ON ms.goal_id = g.id
       WHERE g.is_public = TRUE
         AND g.status = 'active'
         AND g.user_id != $1
         AND ($2::text IS NULL OR g.title ILIKE '%' || $2 || '%' OR g.description ILIKE '%' || $2 || '%')
         AND ($3::text IS NULL OR g.category::text = $3)
         AND (
           $4::text IS NULL
           OR ($4 = 'open' AND NOT EXISTS(SELECT 1 FROM buddy_connections bc3 WHERE bc3.goal_id = g.id AND bc3.status = 'accepted'))
           OR ($4 = 'taken' AND EXISTS(SELECT 1 FROM buddy_connections bc3 WHERE bc3.goal_id = g.id AND bc3.status = 'accepted'))
         )
       ORDER BY a.activity_level DESC, g.created_at DESC
       LIMIT 40`,
      [req.userId, q || null, category || null, buddyFilter || null]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

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
        a.activity_level AS buddy_activity_level,
        EXISTS(
          SELECT 1 FROM buddy_connections bc2
          WHERE bc2.goal_id = g.id AND bc2.status = 'pending'
        ) AS has_pending_request
       FROM goals g
       LEFT JOIN buddy_connections bc ON (bc.goal_id = g.id OR bc.receiver_goal_id = g.id) AND bc.status = 'accepted'
       LEFT JOIN users u ON u.id = CASE WHEN bc.requester_id = $1 THEN bc.receiver_id ELSE bc.requester_id END
       LEFT JOIN activity_stats a ON a.user_id = u.id
       WHERE g.user_id = $1
       ORDER BY g.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// POST /goals/from-template
router.post('/from-template', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { sourceGoalId } = req.body;
  if (!sourceGoalId) { res.status(400).json({ error: 'sourceGoalId required' }); return; }
  try {
    const goalRes = await query(
      `SELECT title, category, description FROM goals WHERE id = $1 AND is_public = TRUE AND status = 'active'`,
      [sourceGoalId]
    );
    if (!goalRes.rows[0]) { res.status(404).json({ error: 'Goal not found' }); return; }
    const { title, category, description } = goalRes.rows[0];

    const newGoal = await query(
      `INSERT INTO goals (user_id, title, category, description, is_public)
       VALUES ($1, $2, $3, $4, FALSE) RETURNING *`,
      [req.userId, title, category, description]
    );

    const milestones = await query(
      `SELECT title, description, frequency FROM milestones WHERE goal_id = $1`,
      [sourceGoalId]
    );
    for (const m of milestones.rows) {
      await query(
        `INSERT INTO milestones (goal_id, user_id, title, description, frequency)
         VALUES ($1, $2, $3, $4, $5)`,
        [newGoal.rows[0].id, req.userId, m.title, m.description, m.frequency]
      );
    }

    res.status(201).json(newGoal.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /goals
router.post('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, category, description, targetDate, isPublic, coopOpen } = req.body;
  if (!title || !category) { res.status(400).json({ error: 'title and category required' }); return; }
  try {
    const isCoop = !!coopOpen;
    const result = await query(
      `INSERT INTO goals (user_id, title, category, description, target_date, is_public, coop_open)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.userId, title, category, description || null, targetDate || null, isCoop ? true : isPublic !== false, isCoop]
    );
    res.status(201).json(result.rows[0]);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// GET /goals/:goalId/stats  — streak + completion rate for recurring milestones
router.get('/:goalId/stats', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { goalId } = req.params;

    const msResult = await query(
      `SELECT m.id, m.title, m.frequency, m.created_at::date AS created_date
       FROM milestones m
       WHERE m.goal_id = $1 AND m.user_id = $2 AND m.frequency != 'once'
       ORDER BY m.created_at`,
      [goalId, req.userId]
    );

    if (msResult.rows.length === 0) { res.json([]); return; }

    const getPeriodKey = (d: Date, freq: string): string => {
      const dt = new Date(d);
      dt.setHours(0, 0, 0, 0);
      if (freq === 'daily') return dt.toISOString().split('T')[0];
      if (freq === 'weekly') {
        const day = dt.getDay();
        dt.setDate(dt.getDate() - ((day + 6) % 7));
        return dt.toISOString().split('T')[0];
      }
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-01`;
    };

    const prevPeriod = (d: Date, freq: string): Date => {
      const dt = new Date(d);
      if (freq === 'daily') dt.setDate(dt.getDate() - 1);
      else if (freq === 'weekly') dt.setDate(dt.getDate() - 7);
      else dt.setMonth(dt.getMonth() - 1);
      return dt;
    };

    const stats = await Promise.all(msResult.rows.map(async (ms: any) => {
      const logsResult = await query(
        `SELECT period_start::text FROM milestone_logs WHERE milestone_id = $1 ORDER BY period_start ASC`,
        [ms.id]
      );
      const logs: string[] = logsResult.rows.map((r: any) => r.period_start);
      const logSet = new Set(logs);

      const now = new Date(); now.setHours(0, 0, 0, 0);
      const created = new Date(ms.created_date); created.setHours(0, 0, 0, 0);

      // Streak: start from today (if done) else yesterday/last period, count back
      let startDate = new Date(now);
      if (!logSet.has(getPeriodKey(now, ms.frequency))) startDate = prevPeriod(now, ms.frequency);
      let streak = 0;
      let checkDate = new Date(startDate);
      while (checkDate >= created && logSet.has(getPeriodKey(checkDate, ms.frequency))) {
        streak++;
        checkDate = prevPeriod(checkDate, ms.frequency);
      }

      // Total expected: completed periods from creation up to (but not including) current period
      const lastCompletedPeriod = prevPeriod(now, ms.frequency);
      let totalExpected = 0;
      if (ms.frequency === 'daily') {
        totalExpected = Math.max(0, Math.floor((lastCompletedPeriod.getTime() - created.getTime()) / 86400000) + 1);
      } else if (ms.frequency === 'weekly') {
        const cw = new Date(created); cw.setDate(created.getDate() - ((created.getDay() + 6) % 7));
        const lw = new Date(lastCompletedPeriod); lw.setDate(lastCompletedPeriod.getDate() - ((lastCompletedPeriod.getDay() + 6) % 7));
        totalExpected = Math.max(0, Math.floor((lw.getTime() - cw.getTime()) / (7 * 86400000)) + 1);
      } else {
        const cm = new Date(created.getFullYear(), created.getMonth(), 1);
        const lm = new Date(lastCompletedPeriod.getFullYear(), lastCompletedPeriod.getMonth(), 1);
        totalExpected = Math.max(0, (lm.getFullYear() - cm.getFullYear()) * 12 + (lm.getMonth() - cm.getMonth()) + 1);
      }

      const totalCompleted = Math.min(logs.length, totalExpected);
      return {
        id: ms.id,
        title: ms.title,
        frequency: ms.frequency,
        streak,
        total_completed: totalCompleted,
        total_expected: totalExpected,
        completion_rate: totalExpected > 0 ? totalCompleted / totalExpected : 0,
      };
    }));

    res.json(stats);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PATCH /goals/:id
router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, description, targetDate, status, isPublic, coopOpen } = req.body;
  try {
    const result = await query(
      `UPDATE goals SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        target_date = COALESCE($3, target_date),
        status = COALESCE($4, status),
        is_public = COALESCE($5, is_public),
        coop_open = COALESCE($6, coop_open),
        updated_at = NOW()
       WHERE id = $7 AND user_id = $8 RETURNING *`,
      [title, description, targetDate, status, isPublic, coopOpen ?? null, req.params.id, req.userId]
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
