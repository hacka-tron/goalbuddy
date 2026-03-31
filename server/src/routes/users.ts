import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { UserService } from '../services/user.service';
import { ServiceError } from '../lib/errors';

const router = Router();

// ─── Validation Schemas ─────────────────────────────────────

const updateUserSchema = z.object({
  body: z.object({
    displayName: z.string().min(2).optional(),
    username: z.string().min(3).max(30).optional(),
    bio: z.string().optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
    notificationFrequency: z.enum(['instant', 'daily', 'weekly', 'none']).optional(),
    pushToken: z.string().optional(),
    avatarUrl: z.string().url().optional().or(z.literal('')),
  }),
});

const getUserSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

// ─── Routes ─────────────────────────────────────────────────

router.get('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await UserService.getMe(req.userId!);
    res.json(user);
  } catch (err) {
    if (err instanceof ServiceError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code, retryable: err.retryable });
      return;
    }
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR', retryable: true });
  }
});

router.patch('/me', requireAuth, validate(updateUserSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await UserService.updateMe(req.userId!, req.body);
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR', retryable: true });
  }
});

router.get('/:id', requireAuth, validate(getUserSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await UserService.getPublicProfile(req.params.id as string);
    res.json(user);
  } catch (err) {
    if (err instanceof ServiceError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code, retryable: err.retryable });
      return;
    }
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR', retryable: true });
  }
});

export default router;
