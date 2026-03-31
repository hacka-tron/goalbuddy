import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { MilestoneService } from '../services/milestone.service';
import { ServiceError } from '../lib/errors';

const router = Router();

// ─── Validation Schemas ─────────────────────────────────────

const goalIdSchema = z.object({
  params: z.object({
    goalId: z.string().uuid(),
  }),
});

const logMilestoneSchema = z.object({
  params: z.object({
    goalId: z.string().uuid(),
  }),
  body: z.object({
    milestoneId: z.string().uuid(),
    note: z.string().optional(),
  }),
});

const undoLogSchema = z.object({
  params: z.object({
    goalId: z.string().uuid(),
    milestoneId: z.string().uuid(),
  }),
});

const createMilestoneSchema = z.object({
  body: z.object({
    goalId: z.string().uuid(),
    title: z.string().min(1),
    description: z.string().optional(),
    dueDate: z.string().optional(),
    aiSuggested: z.boolean().optional(),
    frequency: z.enum(['once', 'daily', 'weekly', 'monthly', 'x_weekly', 'custom_days']).optional(),
    daysPerWeek: z.number().min(1).max(7).optional(),
    customDays: z.string().optional(),
  }),
});

const patchMilestoneSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    dueDate: z.string().optional(),
    completed: z.boolean().optional(),
  }),
});

// ─── Routes ─────────────────────────────────────────────────

router.get('/feed', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const feed = await MilestoneService.getFeed(req.userId!);
    res.json(feed);
  } catch {
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR', retryable: true });
  }
});

router.get('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const milestones = await MilestoneService.getMyMilestones(req.userId!);
    res.json(milestones);
  } catch {
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR', retryable: true });
  }
});

router.get('/goal/:goalId', requireAuth, validate(goalIdSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const milestones = await MilestoneService.getMilestonesByGoal(req.params.goalId as string, req.userId!);
    res.json(milestones);
  } catch {
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR', retryable: true });
  }
});

router.post('/goal/:goalId/log', requireAuth, validate(logMilestoneSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const { milestoneId, note } = req.body;
  try {
    const result = await MilestoneService.logMilestone(req.userId!, req.params.goalId as string, milestoneId, note);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof ServiceError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code, retryable: err.retryable });
      return;
    }
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR', retryable: true });
  }
});

router.delete('/goal/:goalId/log/:milestoneId', requireAuth, validate(undoLogSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await MilestoneService.undoLog(req.userId!, req.params.goalId as string, req.params.milestoneId as string);
    res.status(204).send();
  } catch (err) {
    if (err instanceof ServiceError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code, retryable: err.retryable });
      return;
    }
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR', retryable: true });
  }
});

router.post('/', requireAuth, validate(createMilestoneSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const milestone = await MilestoneService.createMilestone(req.userId!, req.body);
    res.status(201).json(milestone);
  } catch {
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR', retryable: true });
  }
});

router.patch('/:id', requireAuth, validate(patchMilestoneSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const milestone = await MilestoneService.updateMilestone(req.userId!, req.params.id as string, req.body);
    res.json(milestone);
  } catch (err) {
    if (err instanceof ServiceError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code, retryable: err.retryable });
      return;
    }
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR', retryable: true });
  }
});

export default router;
