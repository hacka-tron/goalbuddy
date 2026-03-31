import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { FinderService } from '../services/finder.service';
import { ServiceError } from '../lib/errors';

const router = Router();

// ─── Validation Schemas ─────────────────────────────────────

const deckSchema = z.object({
  query: z.object({
    goalId: z.string().uuid(),
  }),
});

const swipeSchema = z.object({
  body: z.object({
    swipedId: z.string().uuid(),
    action: z.enum(['like', 'pass']),
    goalId: z.string().uuid(),
    cardGoalId: z.string().uuid().optional(),
  }),
});

// ─── Routes ─────────────────────────────────────────────────

router.get('/deck', requireAuth, validate(deckSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const { goalId } = req.query as { goalId: string };
  try {
    const deck = await FinderService.getDeck(req.userId!, goalId);
    res.json(deck);
  } catch (err) {
    if (err instanceof ServiceError) {
      const body: Record<string, unknown> = { error: err.message, code: err.code, retryable: err.retryable };
      if (err.statusCode === 409) body.locked = true;
      res.status(err.statusCode).json(body);
      return;
    }
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR', retryable: true });
  }
});

router.post('/swipe', requireAuth, validate(swipeSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const { swipedId, action, goalId, cardGoalId } = req.body;
  try {
    const result = await FinderService.recordSwipe(req.userId!, swipedId, action, goalId, cardGoalId);
    res.json({ success: true, ...result });
  } catch {
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR', retryable: true });
  }
});

export default router;
