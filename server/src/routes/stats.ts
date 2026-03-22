import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { query } from '../db';

const router = Router();

// GET /stats/:userId
router.get('/:userId', requireAuth, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT * FROM activity_stats WHERE user_id = $1`,
      [_req.params.userId]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'Stats not found' }); return; }
    res.json(result.rows[0]);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

export default router;
