import { query } from '../db';
import { ServiceError } from '../lib/errors';

export class StatsService {
  static async getStats(userId: string) {
    const result = await query(`SELECT * FROM activity_stats WHERE user_id = $1`, [userId]);
    if (!result.rows[0]) {
      throw new ServiceError('Stats not found', 404, 'NOT_FOUND');
    }
    return result.rows[0];
  }
}
