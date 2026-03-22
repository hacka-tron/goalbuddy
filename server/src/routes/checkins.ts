import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { query } from '../db';
import { getIO } from '../socket';

const router = Router();

// GET /checkins/:connectionId
router.get('/:connectionId', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Verify user is part of this connection
    const connCheck = await query(
      `SELECT id FROM buddy_connections
       WHERE id = $1 AND (requester_id = $2 OR receiver_id = $2)`,
      [req.params.connectionId, req.userId]
    );
    if (!connCheck.rows[0]) { res.status(403).json({ error: 'Forbidden' }); return; }

    const result = await query(
      `SELECT ci.*, u.display_name, u.avatar_url,
              m.title AS milestone_title
       FROM check_ins ci
       JOIN users u ON u.id = ci.author_id
       LEFT JOIN milestones m ON m.id = ci.milestone_id
       WHERE ci.connection_id = $1
       ORDER BY ci.created_at DESC
       LIMIT 50`,
      [req.params.connectionId]
    );
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// POST /checkins
router.post('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { connectionId, message, mood, milestoneId } = req.body;
  if (!connectionId || !message || !mood) {
    res.status(400).json({ error: 'connectionId, message, and mood required' });
    return;
  }
  try {
    // Verify user is part of this connection
    const connCheck = await query(
      `SELECT id FROM buddy_connections
       WHERE id = $1 AND (requester_id = $2 OR receiver_id = $2) AND status = 'accepted'`,
      [connectionId, req.userId]
    );
    if (!connCheck.rows[0]) { res.status(403).json({ error: 'Forbidden' }); return; }

    const result = await query(
      `INSERT INTO check_ins (connection_id, author_id, message, mood, milestone_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [connectionId, req.userId, message, mood, milestoneId || null]
    );
    const checkIn = result.rows[0];

    // Fetch author info for the real-time payload
    const userResult = await query('SELECT display_name, avatar_url FROM users WHERE id = $1', [req.userId]);
    const fullCheckIn = { ...checkIn, ...userResult.rows[0] };

    // Emit via Socket.io to the connection's room
    const io = getIO();
    io.to(`connection:${connectionId}`).emit('new_checkin', fullCheckIn);

    res.status(201).json(fullCheckIn);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

export default router;
