import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { query } from '../db';

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MilestoneRow {
  id: string;
  title: string;
  frequency: string;
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
}

interface DeadlineWarning {
  milestone_id: string;
  title: string;
  frequency: string;
  deadline: string;
  percent_elapsed: number;
  hours_remaining: number;
}

function computeDeadlineWarnings(milestones: MilestoneRow[]): DeadlineWarning[] {
  const now = new Date();
  const warnings: DeadlineWarning[] = [];

  for (const m of milestones) {
    let deadline: Date;
    let percentElapsed: number;

    if (m.frequency === 'once') {
      if (!m.due_date || m.completed_at) continue;
      deadline = new Date(m.due_date);
      // end of that day (23:59:59 UTC)
      deadline.setUTCHours(23, 59, 59, 999);
      const created = new Date(m.created_at);
      const total = deadline.getTime() - created.getTime();
      if (total <= 0) continue;
      percentElapsed = Math.min(100, ((now.getTime() - created.getTime()) / total) * 100);
    } else if (m.frequency === 'daily') {
      // deadline = end of today UTC
      deadline = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
      percentElapsed = (now.getUTCHours() * 60 + now.getUTCMinutes()) / (24 * 60) * 100;
    } else if (m.frequency === 'weekly') {
      // deadline = end of Sunday (day 0) of current week
      const dayOfWeek = now.getUTCDay(); // 0=Sun ... 6=Sat
      const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      deadline = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilSunday, 23, 59, 59, 999));
      // Monday = start of week (day 1); elapsed = how many days since Monday
      const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      percentElapsed = (daysSinceMonday * 24 * 60 + now.getUTCHours() * 60 + now.getUTCMinutes()) / (7 * 24 * 60) * 100;
    } else if (m.frequency === 'monthly') {
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth();
      const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      deadline = new Date(Date.UTC(year, month, daysInMonth, 23, 59, 59, 999));
      const dayOfMonth = now.getUTCDate(); // 1-based
      percentElapsed = ((dayOfMonth - 1) * 24 * 60 + now.getUTCHours() * 60 + now.getUTCMinutes()) / (daysInMonth * 24 * 60) * 100;
    } else {
      continue;
    }

    if (percentElapsed < 75) continue;
    if (now >= deadline) continue; // already past deadline — overdue, not a warning

    const hoursRemaining = Math.max(0, (deadline.getTime() - now.getTime()) / 3600000);

    warnings.push({
      milestone_id: m.id,
      title: m.title,
      frequency: m.frequency,
      deadline: deadline.toISOString(),
      percent_elapsed: Math.round(percentElapsed),
      hours_remaining: Math.round(hoursRemaining * 10) / 10,
    });
  }

  return warnings;
}

async function fetchDeadlineWarningsForGoal(goalId: string, buddyUserId: string): Promise<DeadlineWarning[]> {
  const msResult = await query(
    `SELECT id, title, frequency, due_date::text, created_at::text, completed_at::text
     FROM milestones
     WHERE goal_id = $1 AND user_id = $2`,
    [goalId, buddyUserId]
  );
  return computeDeadlineWarnings(msResult.rows as MilestoneRow[]);
}

// ---------------------------------------------------------------------------
// GET /buddies  — all my connections (pending + accepted)
// ---------------------------------------------------------------------------
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
              (
                m.frequency = 'once'
                AND m.due_date IS NOT NULL
                AND m.due_date < CURRENT_DATE
                AND m.completed_at IS NULL
              )
              OR
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
                    AND ml.period_start >= CASE
                      WHEN m.frequency = 'daily'   THEN CURRENT_DATE - 1
                      WHEN m.frequency = 'weekly'  THEN date_trunc('week', CURRENT_DATE - interval '7 days')::date
                      WHEN m.frequency = 'monthly' THEN date_trunc('month', CURRENT_DATE - interval '1 month')::date
                      ELSE CURRENT_DATE - 1
                    END
                )
              )
            )
        ) AS overdue_count,
        (
          SELECT COUNT(*)::int
          FROM milestones m2
          WHERE m2.goal_id = bc.goal_id
            AND m2.user_id = u.id
            AND m2.frequency = 'daily'
            AND EXTRACT(HOUR FROM NOW() AT TIME ZONE 'UTC') >= 12
            AND NOT EXISTS (
              SELECT 1 FROM milestone_logs ml2
              WHERE ml2.milestone_id = m2.id
                AND ml2.period_start = CURRENT_DATE
            )
        ) AS late_today_count
       FROM buddy_connections bc
       JOIN goals g ON g.id = bc.goal_id
       JOIN users u ON u.id = CASE WHEN bc.requester_id = $1 THEN bc.receiver_id ELSE bc.requester_id END
       LEFT JOIN activity_stats a ON a.user_id = u.id
       WHERE (bc.requester_id = $1 OR bc.receiver_id = $1)
         AND bc.status IN ('pending', 'accepted')
       ORDER BY bc.created_at DESC`,
      [req.userId]
    );

    // Attach deadline_warnings for connections where the current user is the buddy/coach
    // (i.e. is_my_goal = false — they're watching someone else's goal)
    const rows = await Promise.all(
      result.rows.map(async (row: any) => {
        if (!row.is_my_goal) {
          row.deadline_warnings = await fetchDeadlineWarningsForGoal(row.goal_id, row.buddy_id);
        } else {
          row.deadline_warnings = [];
        }
        return row;
      })
    );

    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /buddies/request
router.post('/request', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { goalId, coopJoin } = req.body;
  if (!goalId) { res.status(400).json({ error: 'goalId required' }); return; }
  try {
    const goalRes = await query(
      `SELECT user_id, coop_open, title, category, description FROM goals WHERE id = $1 AND is_public = TRUE AND status = 'active'`,
      [goalId]
    );
    if (!goalRes.rows[0]) { res.status(404).json({ error: 'Goal not found' }); return; }
    const { user_id: receiverId, coop_open, title, category, description } = goalRes.rows[0];
    const connType = coopJoin ? 'coop' : (coop_open ? 'coop' : 'accountability');
    if (receiverId === req.userId) { res.status(400).json({ error: 'Cannot request yourself' }); return; }

    const existing = await query(
      `SELECT status FROM buddy_connections WHERE goal_id = $1 AND status = 'accepted'`,
      [goalId]
    );
    if (existing.rows.length > 0) { res.status(409).json({ error: 'Goal already has a buddy' }); return; }

    // For co-op joins: copy the goal into the requester's account
    let requesterGoalId: string | null = null;
    if (coopJoin) {
      const copyGoal = await query(
        `INSERT INTO goals (user_id, title, category, description, is_public, coop_open)
         VALUES ($1, $2, $3, $4, TRUE, TRUE) RETURNING id`,
        [req.userId, title, category, description]
      );
      requesterGoalId = copyGoal.rows[0].id;
      // Copy milestones
      const msCopy = await query(
        `SELECT title, description, frequency FROM milestones WHERE goal_id = $1`,
        [goalId]
      );
      for (const ms of msCopy.rows) {
        await query(
          `INSERT INTO milestones (goal_id, user_id, title, description, frequency) VALUES ($1, $2, $3, $4, $5)`,
          [requesterGoalId, req.userId, ms.title, ms.description, ms.frequency]
        );
      }
    }

    const result = await query(
      `INSERT INTO buddy_connections (requester_id, receiver_id, goal_id, status, connection_type, receiver_goal_id)
       VALUES ($1, $2, $3, 'pending', $4, $5)
       ON CONFLICT (requester_id, receiver_id, goal_id) DO UPDATE SET status = 'pending', connection_type = $4
       RETURNING *`,
      [req.userId, receiverId, goalId, connType, requesterGoalId]
    );
    res.status(201).json({ connection: result.rows[0], newGoalId: requesterGoalId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /buddies/:id/goal-stats  — coaching stats for the goal owner's milestones
// Must be registered BEFORE /:id to avoid routing collision
router.get('/:id/goal-stats', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const connResult = await query(
      `SELECT bc.id, bc.goal_id, bc.requester_id, bc.receiver_id,
              (g.user_id = $1) AS is_my_goal,
              u.id AS buddy_id, u.display_name AS buddy_name
       FROM buddy_connections bc
       JOIN goals g ON g.id = bc.goal_id
       JOIN users u ON u.id = CASE WHEN bc.requester_id = $1 THEN bc.receiver_id ELSE bc.requester_id END
       WHERE bc.id = $2
         AND (bc.requester_id = $1 OR bc.receiver_id = $1)
         AND bc.status = 'accepted'`,
      [req.userId, req.params.id]
    );
    if (!connResult.rows[0]) { res.status(404).json({ error: 'Connection not found' }); return; }
    const conn = connResult.rows[0];

    // The goal owner is the buddy (the person whose goal it is)
    const goalOwnerId = conn.buddy_id;
    const goalId = conn.goal_id;

    // Fetch recurring milestones for the goal owner
    const msResult = await query(
      `SELECT m.id, m.title, m.frequency, m.created_at::date AS created_date
       FROM milestones m
       WHERE m.goal_id = $1 AND m.user_id = $2 AND m.frequency != 'once'
       ORDER BY m.created_at`,
      [goalId, goalOwnerId]
    );

    if (msResult.rows.length === 0) {
      res.json({ buddy_name: conn.buddy_name, milestone_stats: [], overall_completion_rate: 0, overall_skip_rate: 1 });
      return;
    }

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

    const milestoneStats = await Promise.all(msResult.rows.map(async (ms: any) => {
      const logsResult = await query(
        `SELECT period_start::text FROM milestone_logs WHERE milestone_id = $1 AND user_id = $2 ORDER BY period_start ASC`,
        [ms.id, goalOwnerId]
      );
      const logs: string[] = logsResult.rows.map((r: any) => r.period_start);
      const logSet = new Set(logs);

      const now = new Date(); now.setHours(0, 0, 0, 0);
      const created = new Date(ms.created_date); created.setHours(0, 0, 0, 0);

      // Streak
      let startDate = new Date(now);
      if (!logSet.has(getPeriodKey(now, ms.frequency))) startDate = prevPeriod(now, ms.frequency);
      let streak = 0;
      let checkDate = new Date(startDate);
      while (checkDate >= created && logSet.has(getPeriodKey(checkDate, ms.frequency))) {
        streak++;
        checkDate = prevPeriod(checkDate, ms.frequency);
      }

      // Total expected
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
      const completionRate = totalExpected > 0 ? totalCompleted / totalExpected : 0;

      return {
        id: ms.id,
        title: ms.title,
        frequency: ms.frequency,
        streak,
        total_completed: totalCompleted,
        total_expected: totalExpected,
        completion_rate: completionRate,
        skip_rate: 1 - completionRate,
      };
    }));

    const overallCompletionRate = milestoneStats.length > 0
      ? milestoneStats.reduce((sum, m) => sum + m.completion_rate, 0) / milestoneStats.length
      : 0;

    res.json({
      buddy_name: conn.buddy_name,
      milestone_stats: milestoneStats,
      overall_completion_rate: Math.round(overallCompletionRate * 1000) / 1000,
      overall_skip_rate: Math.round((1 - overallCompletionRate) * 1000) / 1000,
    });
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
        a.response_rate, a.last_checkin_at,
        (g.user_id = $1) AS is_my_goal,
        (SELECT COUNT(*)::int FROM milestones m
         WHERE m.goal_id = bc.goal_id AND m.user_id = u.id
           AND ((m.frequency = 'once' AND m.due_date IS NOT NULL AND m.due_date < CURRENT_DATE AND m.completed_at IS NULL)
             OR (m.frequency != 'once' AND m.created_at::date < CASE
                   WHEN m.frequency = 'daily'   THEN CURRENT_DATE - 1
                   WHEN m.frequency = 'weekly'  THEN date_trunc('week', CURRENT_DATE - interval '7 days')::date
                   WHEN m.frequency = 'monthly' THEN date_trunc('month', CURRENT_DATE - interval '1 month')::date
                   ELSE CURRENT_DATE - 1 END
               AND NOT EXISTS (SELECT 1 FROM milestone_logs ml WHERE ml.milestone_id = m.id AND ml.user_id = u.id
                   AND ml.period_start >= CASE
                     WHEN m.frequency = 'daily'   THEN CURRENT_DATE - 1
                     WHEN m.frequency = 'weekly'  THEN date_trunc('week', CURRENT_DATE - interval '7 days')::date
                     WHEN m.frequency = 'monthly' THEN date_trunc('month', CURRENT_DATE - interval '1 month')::date
                     ELSE CURRENT_DATE - 1 END)))
        ) AS overdue_count,
        (SELECT COUNT(*)::int FROM milestones m2
         WHERE m2.goal_id = bc.goal_id AND m2.user_id = u.id
           AND m2.frequency = 'daily'
           AND EXTRACT(HOUR FROM NOW() AT TIME ZONE 'UTC') >= 12
           AND NOT EXISTS (SELECT 1 FROM milestone_logs ml2
               WHERE ml2.milestone_id = m2.id AND ml2.period_start = CURRENT_DATE)
        ) AS late_today_count
       FROM buddy_connections bc
       JOIN goals g ON g.id = bc.goal_id
       JOIN users u ON u.id = CASE WHEN bc.requester_id = $1 THEN bc.receiver_id ELSE bc.requester_id END
       LEFT JOIN activity_stats a ON a.user_id = u.id
       WHERE bc.id = $2
         AND (bc.requester_id = $1 OR bc.receiver_id = $1)`,
      [req.userId, req.params.id]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'Connection not found' }); return; }

    const row = result.rows[0];
    // Attach deadline_warnings when the caller is the buddy/coach (not the goal owner)
    if (!row.is_my_goal) {
      row.deadline_warnings = await fetchDeadlineWarningsForGoal(row.goal_id, row.buddy_id);
    } else {
      row.deadline_warnings = [];
    }

    res.json(row);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
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
