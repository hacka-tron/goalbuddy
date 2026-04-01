import { query } from '../db';
import { ServiceError } from '../lib/errors';

function formatDateOnly(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

function normalizeMilestoneDates<T extends Record<string, unknown>>(milestone: T): T {
  return {
    ...milestone,
    due_date: formatDateOnly(milestone.due_date),
    start_date: formatDateOnly(milestone.start_date),
    end_date: formatDateOnly(milestone.end_date),
  };
}

export class MilestoneService {
  static async getFeed(userId: string) {
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
      [userId]
    );
    return result.rows;
  }

  static async getMyMilestones(userId: string) {
    const result = await query(
      `SELECT m.*, g.title AS goal_title, g.category AS goal_category,
         CASE
           WHEN m.frequency = 'once' THEN (m.completed_at IS NOT NULL)
           WHEN m.frequency IN ('daily', 'x_weekly', 'custom_days') THEN EXISTS (
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
      [userId]
    );
    return result.rows.map(normalizeMilestoneDates);
  }

  static async getMilestonesByGoal(goalId: string, userId: string) {
    const result = await query(
      `SELECT
         m.*,
         u.display_name,
         u.avatar_url,
         CASE
           WHEN m.frequency = 'once' THEN (m.completed_at IS NOT NULL)
           WHEN m.frequency IN ('daily', 'x_weekly', 'custom_days') THEN EXISTS (
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
      [goalId, userId]
    );
    return result.rows.map(normalizeMilestoneDates);
  }

  static async logMilestone(userId: string, goalId: string, milestoneId: string, note?: string) {
    const milestoneResult = await query(
      `SELECT id, frequency FROM milestones WHERE id = $1 AND goal_id = $2`,
      [milestoneId, goalId]
    );
    if (!milestoneResult.rows[0]) {
      throw new ServiceError('Milestone not found', 404, 'NOT_FOUND');
    }

    const { frequency } = milestoneResult.rows[0];
    let periodStart: string;
    switch (frequency) {
      case 'daily':
      case 'x_weekly':
      case 'custom_days':
        periodStart = 'CURRENT_DATE';
        break;
      case 'weekly':
        periodStart = `date_trunc('week', CURRENT_DATE)::date`;
        break;
      case 'monthly':
        periodStart = `date_trunc('month', CURRENT_DATE)::date`;
        break;
      default:
        throw new ServiceError('Use PATCH /milestones/:id for once-type milestones', 400, 'BAD_REQUEST');
    }

    const result = await query(
      `INSERT INTO milestone_logs (milestone_id, user_id, period_start, note)
       SELECT $1, $2, ${periodStart}, $3
       WHERE NOT EXISTS (
         SELECT 1 FROM milestone_logs
         WHERE milestone_id = $1 AND user_id = $2 AND period_start = ${periodStart}
       )
       RETURNING *`,
      [milestoneId, userId, note || null]
    );

    return { logged: (result.rowCount ?? 0) > 0, row: result.rows[0] || null };
  }

  static async undoLog(userId: string, goalId: string, milestoneId: string) {
    const msResult = await query(
      `SELECT id, frequency FROM milestones WHERE id = $1 AND goal_id = $2 AND user_id = $3`,
      [milestoneId, goalId, userId]
    );
    if (!msResult.rows[0]) {
      throw new ServiceError('Milestone not found', 404, 'NOT_FOUND');
    }

    const { frequency } = msResult.rows[0];
    let periodStart: string;
    switch (frequency) {
      case 'daily':
      case 'x_weekly':
      case 'custom_days':
        periodStart = 'CURRENT_DATE';
        break;
      case 'weekly':
        periodStart = `date_trunc('week', CURRENT_DATE)::date`;
        break;
      case 'monthly':
        periodStart = `date_trunc('month', CURRENT_DATE)::date`;
        break;
      default:
        throw new ServiceError('Use PATCH /milestones/:id for once-type milestones', 400, 'BAD_REQUEST');
    }

    await query(
      `DELETE FROM milestone_logs WHERE milestone_id = $1 AND user_id = $2 AND period_start = ${periodStart}`,
      [milestoneId, userId]
    );
  }

  static async createMilestone(userId: string, data: {
    goalId: string;
    title: string;
    description?: string;
    dueDate?: string;
    aiSuggested?: boolean;
    frequency?: string;
    daysPerWeek?: number;
    customDays?: string;
    scheduleMode?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const result = await query(
      `INSERT INTO milestones
         (goal_id, user_id, title, description, due_date, ai_suggested,
          frequency, days_per_week, custom_days,
          schedule_mode, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        data.goalId,
        userId,
        data.title,
        data.description || null,
        data.dueDate || null,
        data.aiSuggested || false,
        data.frequency || 'once',
        data.daysPerWeek ?? null,
        data.customDays ?? null,
        data.scheduleMode || 'open_ended',
        data.startDate || null,
        data.endDate || null,
      ]
    );
    return normalizeMilestoneDates(result.rows[0]);
  }

  static async updateMilestone(userId: string, id: string, data: {
    title?: string;
    description?: string;
    dueDate?: string;
    completed?: boolean;
    scheduleMode?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const result = await query(
      `UPDATE milestones SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        due_date = COALESCE($3, due_date),
        completed_at = CASE WHEN $4 = TRUE THEN NOW() WHEN $4 = FALSE THEN NULL ELSE completed_at END,
        schedule_mode = COALESCE($5, schedule_mode),
        start_date = COALESCE($6::date, start_date),
        end_date = COALESCE($7::date, end_date)
       WHERE id = $8 AND user_id = $9
       RETURNING *`,
      [
        data.title,
        data.description,
        data.dueDate,
        data.completed,
        data.scheduleMode,
        data.startDate,
        data.endDate,
        id,
        userId,
      ]
    );
    if (!result.rows[0]) {
      throw new ServiceError('Milestone not found', 404, 'NOT_FOUND');
    }
    return normalizeMilestoneDates(result.rows[0]);
  }
}
