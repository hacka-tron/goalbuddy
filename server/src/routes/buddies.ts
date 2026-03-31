import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { BuddyService } from '../services/buddy.service';
import { ServiceError } from '../lib/errors';

const router = Router();

// ─── Validation Schemas ─────────────────────────────────────

const requestBuddySchema = z.object({
  body: z.object({
    goalId: z.string().uuid(),
    coopJoin: z.boolean().optional(),
  }),
});

const patchConnectionSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    status: z.enum(['accepted', 'declined']),
  }),
});

const connectionIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

// ─── Routes ─────────────────────────────────────────────────

router.get('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const connections = await BuddyService.getConnections(req.userId!);
    res.json(connections);
  } catch {
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR', retryable: true });
  }
});

router.post('/request', requireAuth, validate(requestBuddySchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const { goalId, coopJoin } = req.body;
  try {
    const result = await BuddyService.requestBuddy(req.userId!, goalId, !!coopJoin);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof ServiceError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code, retryable: err.retryable });
      return;
    }
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR', retryable: true });
  }
});

router.get('/:id/goal-stats', requireAuth, validate(connectionIdSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stats = await BuddyService.getConnectionGoalStats(req.userId!, req.params.id as string);
    res.json(stats);
  } catch (err) {
    if (err instanceof ServiceError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code, retryable: err.retryable });
      return;
    }
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR', retryable: true });
  }
});

router.get('/:id', requireAuth, validate(connectionIdSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const connection = await BuddyService.getConnection(req.userId!, req.params.id as string);
    res.json(connection);
  } catch (err) {
    if (err instanceof ServiceError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code, retryable: err.retryable });
      return;
    }
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR', retryable: true });
  }
});

router.patch('/:id', requireAuth, validate(patchConnectionSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const { status } = req.body;
  try {
    const connection = await BuddyService.updateConnectionStatus(req.userId!, req.params.id as string, status);
    res.json(connection);
  } catch (err) {
    if (err instanceof ServiceError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code, retryable: err.retryable });
      return;
    }
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('already has an accepted buddy')) {
      res.status(409).json({ error: 'This goal already has an accepted buddy', code: 'CONFLICT', retryable: false });
    } else {
      res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR', retryable: true });
    }
  }
});

export default router;
