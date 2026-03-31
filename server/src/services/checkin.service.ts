import { query } from '../db';
import { ServiceError } from '../lib/errors';

export class CheckinService {
  static async getCheckins(userId: string, connectionId: string, before?: string, limit = 20) {
    const safeLimit = Math.min(limit, 100);

    const connCheck = await query(
      `SELECT id FROM buddy_connections
       WHERE id = $1 AND (requester_id = $2 OR receiver_id = $2)`,
      [connectionId, userId]
    );
    if (!connCheck.rows[0]) {
      throw new ServiceError('Forbidden', 403, 'FORBIDDEN');
    }

    const params: unknown[] = [connectionId, safeLimit + 1];
    let whereClause = 'WHERE ci.connection_id = $1';
    if (before) {
      params.push(before);
      whereClause += ` AND ci.created_at < $${params.length}`;
    }

    const result = await query(
      `SELECT ci.*, u.display_name, u.avatar_url,
              m.title AS milestone_title
       FROM check_ins ci
       JOIN users u ON u.id = ci.author_id
       LEFT JOIN milestones m ON m.id = ci.milestone_id
       ${whereClause}
       ORDER BY ci.created_at DESC
       LIMIT $2`,
      params
    );

    const rows = result.rows;
    const hasMore = rows.length > safeLimit;
    const messages = hasMore ? rows.slice(0, safeLimit) : rows;
    const nextCursor = hasMore && messages.length > 0
      ? messages[messages.length - 1].created_at instanceof Date
        ? (messages[messages.length - 1].created_at as Date).toISOString()
        : messages[messages.length - 1].created_at
      : null;

    return { messages, hasMore, nextCursor };
  }

  static async createCheckin(
    userId: string,
    connectionId: string,
    message: string,
    mood: string,
    milestoneId?: string | null,
  ) {
    const connCheck = await query(
      `SELECT id FROM buddy_connections
       WHERE id = $1 AND (requester_id = $2 OR receiver_id = $2) AND status = 'accepted'`,
      [connectionId, userId]
    );
    if (!connCheck.rows[0]) {
      throw new ServiceError('Forbidden', 403, 'FORBIDDEN');
    }

    const result = await query(
      `INSERT INTO check_ins (connection_id, author_id, message, mood, milestone_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [connectionId, userId, message, mood, milestoneId || null]
    );
    const checkIn = result.rows[0];

    const userResult = await query('SELECT display_name, avatar_url FROM users WHERE id = $1', [userId]);
    return { ...checkIn, ...userResult.rows[0] };
  }
}
