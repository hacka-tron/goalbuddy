import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { StatsService } from '../services/stats.service';
import { ServiceError } from '../lib/errors';

const router = Router();

// ─── Validation Schemas ─────────────────────────────────────

const getStatsSchema = z.object({
  params: z.object({
    userId: z.string().uuid(),
  }),
});

// ─── Routes ─────────────────────────────────────────────────

router.get('/:userId', requireAuth, validate(getStatsSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stats = await StatsService.getStats(req.params.userId as string);
    res.json(stats);
  } catch (err) {
    if (err instanceof ServiceError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code, retryable: err.retryable });
      return;
    }
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR', retryable: true });
  }
});

export default router;
