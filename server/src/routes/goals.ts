import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { GoalService } from '../services/goal.service';
import { ServiceError } from '../lib/errors';

const router = Router();

// ─── Validation Schemas ─────────────────────────────────────

const createGoalSchema = z.object({
  body: z.object({
    title: z.string().min(1),
    category: z.enum(['workout', 'study', 'career', 'health', 'creative', 'finance', 'social', 'other']),
    description: z.string().optional(),
    targetDate: z.string().optional(),
    isPublic: z.boolean().optional(),
    coopOpen: z.boolean().optional(),
  }),
});

const patchGoalSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    targetDate: z.string().optional(),
    status: z.enum(['active', 'completed', 'archived']).optional(),
    isPublic: z.boolean().optional(),
    coopOpen: z.boolean().optional(),
  }),
});

const fromTemplateSchema = z.object({
  body: z.object({
    sourceGoalId: z.string().uuid(),
  }),
});

const getPublicGoalsSchema = z.object({
  query: z.object({
    q: z.string().max(100).optional(),
    category: z.string().max(50).optional(),
    buddyFilter: z.enum(['all', 'unmatched']).optional(),
  }),
});

const goalIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

const goalStatsParamSchema = z.object({
  params: z.object({
    goalId: z.string().uuid(),
  }),
});

// ─── Routes ─────────────────────────────────────────────────

router.get('/public', requireAuth, validate(getPublicGoalsSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const { q, category, buddyFilter } = req.query as { q?: string; category?: string; buddyFilter?: string };
  try {
    const goals = await GoalService.getPublicGoals(req.userId!, q, category, buddyFilter);
    res.json(goals);
  } catch {
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR', retryable: true });
  }
});

router.get('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const goals = await GoalService.getMyGoals(req.userId!);
    res.json(goals);
  } catch {
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR', retryable: true });
  }
});

router.post('/from-template', requireAuth, validate(fromTemplateSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const goal = await GoalService.fromTemplate(req.userId!, req.body.sourceGoalId);
    res.status(201).json(goal);
  } catch (err) {
    if (err instanceof ServiceError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code, retryable: err.retryable });
      return;
    }
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR', retryable: true });
  }
});

router.post('/', requireAuth, validate(createGoalSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const goal = await GoalService.createGoal(req.userId!, req.body);
    res.status(201).json(goal);
  } catch {
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR', retryable: true });
  }
});

router.get('/:goalId/stats', requireAuth, validate(goalStatsParamSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stats = await GoalService.getGoalStats(req.userId!, req.params.goalId as string);
    res.json(stats);
  } catch {
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR', retryable: true });
  }
});

router.patch('/:id', requireAuth, validate(patchGoalSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const goal = await GoalService.updateGoal(req.userId!, req.params.id as string, req.body);
    res.json(goal);
  } catch (err) {
    if (err instanceof ServiceError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code, retryable: err.retryable });
      return;
    }
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR', retryable: true });
  }
});

router.delete('/:id', requireAuth, validate(goalIdParamSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await GoalService.deleteGoal(req.userId!, req.params.id as string);
    res.status(204).send();
  } catch (err) {
    if (err instanceof ServiceError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code, retryable: err.retryable });
      return;
    }
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR', retryable: true });
  }
});

export default router;
