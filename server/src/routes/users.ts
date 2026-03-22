import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { query } from '../db';

const router = Router();

// GET /users/me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.display_name, u.username, u.avatar_url, u.bio, u.theme,
              u.notification_frequency, u.created_at, a.*
       FROM users u
       LEFT JOIN activity_stats a ON a.user_id = u.id
       WHERE u.id = $1`,
      [req.userId]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(result.rows[0]);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// PATCH /users/me
router.patch('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { displayName, username, bio, theme, notificationFrequency, pushToken, avatarUrl } = req.body;
  try {
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
      [displayName, username, bio, theme, notificationFrequency, pushToken, avatarUrl, req.userId]
    );
    res.json(result.rows[0]);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// GET /users/:id  (public profile + stats)
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT u.id, u.display_name, u.username, u.avatar_url, u.bio, u.created_at,
              a.total_checkins, a.current_streak, a.longest_streak,
              a.milestones_completed, a.response_rate, a.last_checkin_at, a.activity_level
       FROM users u
       LEFT JOIN activity_stats a ON a.user_id = u.id
       WHERE u.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(result.rows[0]);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

export default router;
