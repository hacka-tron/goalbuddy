import { query } from '../db';
import { ServiceError } from '../lib/errors';

export class GoalService {
  static async getPublicGoals(userId: string, q?: string, category?: string, buddyFilter?: string) {
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
      [userId, q || null, category || null, buddyFilter || null]
    );
    return result.rows;
  }

  static async getMyGoals(userId: string) {
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
      [userId]
    );
    return result.rows;
  }

  static async createGoal(userId: string, data: {
    title: string;
    category: string;
    description?: string;
    targetDate?: string;
    isPublic?: boolean;
    coopOpen?: boolean;
  }) {
    const isCoop = !!data.coopOpen;
    const result = await query(
      `INSERT INTO goals (user_id, title, category, description, target_date, is_public, coop_open)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, data.title, data.category, data.description || null, data.targetDate || null, isCoop ? true : data.isPublic !== false, isCoop]
    );
    return result.rows[0];
  }

  static async deleteGoal(userId: string, goalId: string) {
    const result = await query('DELETE FROM goals WHERE id = $1 AND user_id = $2', [goalId, userId]);
    if (result.rowCount === 0) {
      throw new ServiceError('Goal not found', 404, 'NOT_FOUND');
    }
  }

  static async fromTemplate(userId: string, sourceGoalId: string) {
    const goalRes = await query(
      `SELECT title, category, description FROM goals WHERE id = $1 AND is_public = TRUE AND status = 'active'`,
      [sourceGoalId]
    );
    if (!goalRes.rows[0]) {
      throw new ServiceError('Goal not found', 404, 'NOT_FOUND');
    }
    const { title, category, description } = goalRes.rows[0];
    const newGoal = await query(
      `INSERT INTO goals (user_id, title, category, description, is_public)
       VALUES ($1, $2, $3, $4, FALSE) RETURNING *`,
      [userId, title, category, description]
    );
    const milestones = await query(
      `SELECT title, description, frequency FROM milestones WHERE goal_id = $1`,
      [sourceGoalId]
    );
    for (const m of milestones.rows) {
      await query(
        `INSERT INTO milestones (goal_id, user_id, title, description, frequency)
         VALUES ($1, $2, $3, $4, $5)`,
        [newGoal.rows[0].id, userId, m.title, m.description, m.frequency]
      );
    }
    return newGoal.rows[0];
  }

  static async updateGoal(userId: string, goalId: string, data: {
    title?: string;
    description?: string;
    targetDate?: string;
    status?: string;
    isPublic?: boolean;
    coopOpen?: boolean;
  }) {
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
      [data.title, data.description, data.targetDate, data.status, data.isPublic, data.coopOpen ?? null, goalId, userId]
    );
    if (!result.rows[0]) {
      throw new ServiceError('Goal not found', 404, 'NOT_FOUND');
    }
    return result.rows[0];
  }

  static async getGoalStats(userId: string, goalId: string) {
    const msResult = await query(
      `SELECT m.id, m.title, m.frequency, m.created_at::date AS created_date
       FROM milestones m
       WHERE m.goal_id = $1 AND m.user_id = $2 AND m.frequency != 'once'
       ORDER BY m.created_at`,
      [goalId, userId]
    );

    if (msResult.rows.length === 0) return [];

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

    return Promise.all(msResult.rows.map(async (ms: any) => {
      const logsResult = await query(
        `SELECT period_start::text FROM milestone_logs WHERE milestone_id = $1 ORDER BY period_start ASC`,
        [ms.id]
      );
      const logs: string[] = logsResult.rows.map((r: any) => r.period_start);
      const logSet = new Set(logs);

      const now = new Date(); now.setHours(0, 0, 0, 0);
      const created = new Date(ms.created_date); created.setHours(0, 0, 0, 0);

      let startDate = new Date(now);
      if (!logSet.has(getPeriodKey(now, ms.frequency))) startDate = prevPeriod(now, ms.frequency);
      let streak = 0;
      let checkDate = new Date(startDate);
      while (checkDate >= created && logSet.has(getPeriodKey(checkDate, ms.frequency))) {
        streak++;
        checkDate = prevPeriod(checkDate, ms.frequency);
      }

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
  }
}
