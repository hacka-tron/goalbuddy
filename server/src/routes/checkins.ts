import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { CheckinService } from '../services/checkin.service';
import { ServiceError } from '../lib/errors';
import { getIO } from '../socket';

const router = Router();

// ─── Validation Schemas ─────────────────────────────────────

const getCheckinsSchema = z.object({
  params: z.object({
    connectionId: z.string().uuid(),
  }),
  query: z.object({
    before: z.string().optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});

const createCheckinSchema = z.object({
  body: z.object({
    connectionId: z.string().uuid(),
    message: z.string().min(1),
    mood: z.string().min(1),
    milestoneId: z.string().uuid().optional().nullable(),
  }),
});

// ─── Routes ─────────────────────────────────────────────────

router.get('/:connectionId', requireAuth, validate(getCheckinsSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const before = req.query.before as string | undefined;
  const limit = parseInt((req.query.limit as string) || '20', 10);
  try {
    const result = await CheckinService.getCheckins(req.userId!, req.params.connectionId as string, before, limit);
    res.json(result);
  } catch (err) {
    if (err instanceof ServiceError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code, retryable: err.retryable });
      return;
    }
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR', retryable: true });
  }
});

router.post('/', requireAuth, validate(createCheckinSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const { connectionId, message, mood, milestoneId } = req.body;
  try {
    const fullCheckIn = await CheckinService.createCheckin(req.userId!, connectionId, message, mood, milestoneId);
    const io = getIO();
    io.to(`connection:${connectionId}`).emit('new_checkin', fullCheckIn);
    res.status(201).json(fullCheckIn);
  } catch (err) {
    if (err instanceof ServiceError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code, retryable: err.retryable });
      return;
    }
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR', retryable: true });
  }
});

export default router;
