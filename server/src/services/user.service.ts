import { query } from '../db';
import { ServiceError } from '../lib/errors';

export class UserService {
  static async getMe(userId: string) {
    const result = await query(
      `SELECT u.id, u.email, u.display_name, u.username, u.avatar_url, u.bio, u.theme,
              u.notification_frequency, u.created_at, a.*
       FROM users u
       LEFT JOIN activity_stats a ON a.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );
    if (!result.rows[0]) {
      throw new ServiceError('User not found', 404, 'NOT_FOUND');
    }
    return result.rows[0];
  }

  static async updateMe(userId: string, data: {
    displayName?: string;
    username?: string;
    bio?: string;
    theme?: string;
    notificationFrequency?: string;
    pushToken?: string;
    avatarUrl?: string;
  }) {
    const result = await query(
      `UPDATE users SET
        display_name = COALESCE($1, display_name),
        username = COALESCE($2, username),
        bio = COALESCE($3, bio),
        theme = COALESCE($4, theme),
        notification_frequency = COALESCE($5, notification_frequency),
        push_token = COALESCE($6, push_token),
        avatar_url = COALESCE($7, avatar_url),
        updated_at = NOW()
       WHERE id = $8
       RETURNING id, email, display_name, username, avatar_url, bio, theme, notification_frequency`,
      [data.displayName, data.username, data.bio, data.theme, data.notificationFrequency, data.pushToken, data.avatarUrl, userId]
    );
    return result.rows[0];
  }

  static async getPublicProfile(userId: string) {
    const result = await query(
      `SELECT u.id, u.display_name, u.username, u.avatar_url, u.bio, u.created_at,
              a.total_checkins, a.current_streak, a.longest_streak,
              a.milestones_completed, a.response_rate, a.last_checkin_at, a.activity_level
       FROM users u
       LEFT JOIN activity_stats a ON a.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );
    if (!result.rows[0]) {
      throw new ServiceError('User not found', 404, 'NOT_FOUND');
    }
    return result.rows[0];
  }
}
