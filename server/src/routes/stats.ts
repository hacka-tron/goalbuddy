import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { query } from '../db';
import { validate } from '../middleware/validate';

const router = Router();

// ─── Validation Schemas ─────────────────────────────────────

const getStatsSchema = z.object({
  params: z.object({
    userId: z.string().uuid(),
  }),
});

// ─── Routes ─────────────────────────────────────────────────

// GET /stats/:userId
router.get('/:userId', requireAuth, validate(getStatsSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT * FROM activity_stats WHERE user_id = $1`,
      [req.params.userId]
    );
    if (!result.rows[0]) { 
      res.status(404).json({ 
        error: 'Stats not found',
        code: 'NOT_FOUND',
        retryable: false
      }); 
      return; 
    }
    res.json(result.rows[0]);
  } catch { 
    res.status(500).json({ 
      error: 'Server error',
      code: 'SERVER_ERROR',
      retryable: true
    }); 
  }
});

export default router;
