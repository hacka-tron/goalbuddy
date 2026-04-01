# Time-Bound Milestones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `schedule_mode` / `start_date` / `end_date` to milestones, add a schedule section to the frequency picker, and surface finite stats (expected sessions, remaining, % complete) for milestones with an end date.

**Architecture:** DB migration adds three columns with a safe default (`open_ended`, null dates). A shared utility computes expected sessions from frequency + date range. Backend validation enforces time-bound rules. Mobile picks up the new fields in the frequency/schedule picker; draft rows show a schedule summary. Stats in `buddy.service.ts` add optional finite fields when `end_date` is present. No backwards-compat shims — existing milestones default to `open_ended` with null dates.

**Tech Stack:** PostgreSQL, Node.js/Express, Zod, TypeScript, React Native, Expo SDK 55, TanStack Query, Zustand.

---

## File Map

| File | Status | Change |
|---|---|---|
| `server/src/db/migrations/007_milestone_schedule.sql` | **Create** | Add `schedule_mode`, `start_date`, `end_date` columns |
| `server/src/routes/milestones.ts` | Modify | Add schedule fields to create/patch Zod schemas with refinements |
| `server/src/services/milestone.service.ts` | Modify | Persist and return schedule fields in `createMilestone` and `updateMilestone` |
| `server/src/lib/milestone-utils.ts` | **Create** | `computeExpectedSessions(freq, dpw, customDays, start, end)` utility |
| `server/src/services/buddy.service.ts` | Modify | Fetch schedule columns in `getStats`; use `start_date` for tracking; add finite stats when `end_date` present |
| `server/src/__tests__/milestones.test.ts` | Modify | Add schedule mode validation tests |
| `server/src/__tests__/milestone-utils.test.ts` | **Create** | Unit tests for `computeExpectedSessions` |
| `server/src/__tests__/buddies.test.ts` | Modify | Add finite stats test |
| `server/src/__tests__/setup/db-helpers.ts` | Modify | Extend `seedMilestone` with schedule overrides |
| `shared/types/index.ts` | Modify | Add `schedule_mode`, `start_date`, `end_date` to `Milestone` |
| `mobile/features/goals/types.ts` | Modify | Same + extend `MilestoneStats` with optional finite fields |
| `mobile/features/goals/components/FrequencyPickerModal.tsx` | Modify | Add schedule section (mode toggle + date inputs + no-end-date toggle) |
| `mobile/features/goals/screens/GoalsScreen.tsx` | Modify | Schedule state, draft row summary, coop hint removal, `* required` layout |
| `mobile/features/goals/api.ts` | Modify | `createMilestone` sends schedule fields |

---

## Task 1: DB Migration — schedule_mode, start_date, end_date

**Files:**
- Create: `server/src/db/migrations/007_milestone_schedule.sql`

- [ ] **Step 1: Write migration file**

```sql
-- ─────────────────────────────────────────────────────────────
-- Migration 007: Milestone schedule mode (open_ended / time_bound)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS schedule_mode TEXT NOT NULL DEFAULT 'open_ended';

ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS start_date DATE;

ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS end_date DATE;
```

Existing milestones automatically get `schedule_mode = 'open_ended'`, `start_date = NULL`, `end_date = NULL`. No data migration needed.

- [ ] **Step 2: Run migration on dev DB**

```bash
psql goalbuddy < server/src/db/migrations/007_milestone_schedule.sql
```

Expected: no errors. Verify with: `psql goalbuddy -c "\d milestones"` — confirm three new columns are present.

- [ ] **Step 3: Run migration on test DB**

```bash
psql goalbuddy_test < server/src/db/migrations/007_milestone_schedule.sql
```

Expected: same result.

- [ ] **Step 4: Commit**

```bash
git add server/src/db/migrations/007_milestone_schedule.sql
git commit -m "feat: add schedule_mode, start_date, end_date to milestones"
```

---

## Task 2: Backend — Validation + Service

**Files:**
- Modify: `server/src/__tests__/milestones.test.ts`
- Modify: `server/src/routes/milestones.ts`
- Modify: `server/src/services/milestone.service.ts`

- [ ] **Step 1: Write failing tests**

Add these `describe` blocks to `server/src/__tests__/milestones.test.ts` (append after existing tests):

```typescript
describe('POST /milestones/ — schedule mode', () => {
  it('defaults to open_ended with null dates when scheduleMode omitted', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id);
    const res = await request(app)
      .post('/milestones/')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ goalId: goal.id, title: 'Daily run', frequency: 'daily' });
    expect(res.status).toBe(201);
    expect(res.body.schedule_mode).toBe('open_ended');
    expect(res.body.start_date).toBeNull();
    expect(res.body.end_date).toBeNull();
  });

  it('creates a time_bound milestone with start and end dates', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id);
    const res = await request(app)
      .post('/milestones/')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        goalId: goal.id,
        title: '30-day program',
        frequency: 'daily',
        scheduleMode: 'time_bound',
        startDate: '2026-05-01',
        endDate: '2026-05-30',
      });
    expect(res.status).toBe(201);
    expect(res.body.schedule_mode).toBe('time_bound');
    expect(res.body.start_date).toBe('2026-05-01');
    expect(res.body.end_date).toBe('2026-05-30');
  });

  it('creates a time_bound milestone with start date and no end date', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id);
    const res = await request(app)
      .post('/milestones/')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        goalId: goal.id,
        title: 'Ongoing program starting May',
        frequency: 'weekly',
        scheduleMode: 'time_bound',
        startDate: '2026-05-01',
      });
    expect(res.status).toBe(201);
    expect(res.body.schedule_mode).toBe('time_bound');
    expect(res.body.start_date).toBe('2026-05-01');
    expect(res.body.end_date).toBeNull();
  });

  it('returns 400 when time_bound has no startDate', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id);
    const res = await request(app)
      .post('/milestones/')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ goalId: goal.id, title: 'Test', frequency: 'daily', scheduleMode: 'time_bound' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when endDate is before startDate', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id);
    const res = await request(app)
      .post('/milestones/')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        goalId: goal.id,
        title: 'Test',
        frequency: 'daily',
        scheduleMode: 'time_bound',
        startDate: '2026-05-15',
        endDate: '2026-05-01',
      });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd server && npm test -- --testPathPattern=milestones.test
```

Expected: FAIL — the new `describe` blocks fail because the new fields are not yet accepted.

- [ ] **Step 3: Update Zod schemas in `server/src/routes/milestones.ts`**

Replace `createMilestoneSchema` with:

```typescript
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
    scheduleMode: z.enum(['open_ended', 'time_bound']).optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
    .refine(
      (b) => b.scheduleMode !== 'time_bound' || !!b.startDate,
      { message: 'startDate is required for time_bound milestones', path: ['startDate'] }
    )
    .refine(
      (b) => !b.endDate || !b.startDate || b.endDate >= b.startDate,
      { message: 'endDate must be on or after startDate', path: ['endDate'] }
    ),
});
```

Replace `patchMilestoneSchema` with:

```typescript
const patchMilestoneSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    dueDate: z.string().optional(),
    completed: z.boolean().optional(),
    scheduleMode: z.enum(['open_ended', 'time_bound']).optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
    .refine(
      (b) => b.scheduleMode !== 'time_bound' || !!b.startDate,
      { message: 'startDate is required for time_bound milestones', path: ['startDate'] }
    )
    .refine(
      (b) => !b.endDate || !b.startDate || b.endDate >= b.startDate,
      { message: 'endDate must be on or after startDate', path: ['endDate'] }
    ),
});
```

- [ ] **Step 4: Update `MilestoneService.createMilestone` in `server/src/services/milestone.service.ts`**

Replace the method signature and body:

```typescript
static async createMilestone(userId: string, data: {
  goalId: string;
  title: string;
  description?: string;
  dueDate?: string;
  aiSuggested?: boolean;
  frequency?: string;
  daysPerWeek?: number;
  customDays?: string;
  scheduleMode?: string;
  startDate?: string;
  endDate?: string;
}) {
  const result = await query(
    `INSERT INTO milestones
       (goal_id, user_id, title, description, due_date, ai_suggested,
        frequency, days_per_week, custom_days,
        schedule_mode, start_date, end_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      data.goalId,
      userId,
      data.title,
      data.description || null,
      data.dueDate || null,
      data.aiSuggested || false,
      data.frequency || 'once',
      data.daysPerWeek ?? null,
      data.customDays ?? null,
      data.scheduleMode || 'open_ended',
      data.startDate || null,
      data.endDate || null,
    ]
  );
  return result.rows[0];
}
```

- [ ] **Step 5: Update `MilestoneService.updateMilestone` in `server/src/services/milestone.service.ts`**

Replace the method signature and body:

```typescript
static async updateMilestone(userId: string, id: string, data: {
  title?: string;
  description?: string;
  dueDate?: string;
  completed?: boolean;
  scheduleMode?: string;
  startDate?: string;
  endDate?: string;
}) {
  const result = await query(
    `UPDATE milestones SET
      title           = COALESCE($1, title),
      description     = COALESCE($2, description),
      due_date        = COALESCE($3, due_date),
      completed_at    = CASE WHEN $4 = TRUE THEN NOW() WHEN $4 = FALSE THEN NULL ELSE completed_at END,
      schedule_mode   = COALESCE($5, schedule_mode),
      start_date      = COALESCE($6::date, start_date),
      end_date        = COALESCE($7::date, end_date)
     WHERE id = $8 AND user_id = $9
     RETURNING *`,
    [
      data.title, data.description, data.dueDate, data.completed,
      data.scheduleMode, data.startDate, data.endDate,
      id, userId,
    ]
  );
  if (!result.rows[0]) {
    throw new ServiceError('Milestone not found', 404, 'NOT_FOUND');
  }
  return result.rows[0];
}
```

Note: `getMyMilestones` and `getMilestonesByGoal` already use `m.*` — the new columns are returned automatically.

- [ ] **Step 6: Run tests to confirm they pass**

```bash
cd server && npm test -- --testPathPattern=milestones.test
```

Expected: All tests pass including the new schedule mode `describe` block.

- [ ] **Step 7: Commit**

```bash
git add server/src/routes/milestones.ts server/src/services/milestone.service.ts server/src/__tests__/milestones.test.ts
git commit -m "feat: add schedule_mode/start_date/end_date to milestone create and update"
```

---

## Task 3: Backend — Expected Sessions Utility

**Files:**
- Create: `server/src/__tests__/milestone-utils.test.ts`
- Create: `server/src/lib/milestone-utils.ts`

- [ ] **Step 1: Write failing tests**

Create `server/src/__tests__/milestone-utils.test.ts`:

```typescript
import { computeExpectedSessions } from '../lib/milestone-utils';

describe('computeExpectedSessions', () => {
  it('daily: counts inclusive days in range', () => {
    // May 1–30 = 30 days
    expect(computeExpectedSessions('daily', null, null, new Date('2026-05-01'), new Date('2026-05-30'))).toBe(30);
  });

  it('daily: same start and end = 1', () => {
    const d = new Date('2026-05-01');
    expect(computeExpectedSessions('daily', null, null, d, d)).toBe(1);
  });

  it('daily: returns 0 when end is before start', () => {
    expect(computeExpectedSessions('daily', null, null, new Date('2026-05-10'), new Date('2026-05-01'))).toBe(0);
  });

  it('weekly: counts calendar weeks that overlap the range', () => {
    // Mon May 4 to Sun May 17 → weeks starting May 4 and May 11 = 2
    expect(computeExpectedSessions('weekly', null, null, new Date('2026-05-04'), new Date('2026-05-17'))).toBe(2);
  });

  it('weekly: 4-week range', () => {
    // Mon May 4 to Sun May 31 → weeks starting May 4, 11, 18, 25 = 4
    expect(computeExpectedSessions('weekly', null, null, new Date('2026-05-04'), new Date('2026-05-31'))).toBe(4);
  });

  it('x_weekly: 3 days/week × 2 weeks = 6', () => {
    // Mon May 4 to Sun May 17 = 2 weeks
    expect(computeExpectedSessions('x_weekly', 3, null, new Date('2026-05-04'), new Date('2026-05-17'))).toBe(6);
  });

  it('monthly: Apr to Jun inclusive = 3', () => {
    expect(computeExpectedSessions('monthly', null, null, new Date('2026-04-01'), new Date('2026-06-30'))).toBe(3);
  });

  it('custom_days: counts matching weekdays in range', () => {
    // Mon May 4 (dow 1) to Fri May 8 (dow 5), custom days Mon/Wed/Fri = 3
    expect(computeExpectedSessions('custom_days', null, '1,3,5', new Date('2026-05-04'), new Date('2026-05-08'))).toBe(3);
  });

  it('once: always returns 1', () => {
    expect(computeExpectedSessions('once', null, null, new Date('2026-05-01'), new Date('2026-05-30'))).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd server && npm test -- --testPathPattern=milestone-utils.test
```

Expected: FAIL — `milestone-utils.ts` does not exist.

- [ ] **Step 3: Create `server/src/lib/milestone-utils.ts`**

```typescript
const MS_PER_DAY = 86_400_000;

/**
 * Compute the total number of expected sessions for a milestone
 * given its frequency and an inclusive date range [startDate, endDate].
 *
 * Used by stats shaping and will be reused by the coach view.
 */
export function computeExpectedSessions(
  frequency: string,
  daysPerWeek: number | null,
  customDays: string | null,
  startDate: Date,
  endDate: Date,
): number {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  if (end < start) return 0;

  switch (frequency) {
    case 'daily': {
      return Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
    }

    case 'weekly': {
      const startMon = mondayOf(start);
      const endMon = mondayOf(end);
      return Math.floor((endMon.getTime() - startMon.getTime()) / (7 * MS_PER_DAY)) + 1;
    }

    case 'x_weekly': {
      const dpw = daysPerWeek ?? 1;
      const startMon = mondayOf(start);
      const endMon = mondayOf(end);
      const weeks = Math.floor((endMon.getTime() - startMon.getTime()) / (7 * MS_PER_DAY)) + 1;
      return weeks * dpw;
    }

    case 'monthly': {
      return (
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth()) +
        1
      );
    }

    case 'custom_days': {
      const days = (customDays ?? '')
        .split(',')
        .map(Number)
        .filter(Boolean);
      let count = 0;
      const cur = new Date(start);
      while (cur <= end) {
        // JS getDay(): 0 = Sun … 6 = Sat; we use 1 = Mon … 7 = Sun
        const dow = cur.getDay() === 0 ? 7 : cur.getDay();
        if (days.includes(dow)) count++;
        cur.setDate(cur.getDate() + 1);
      }
      return count;
    }

    case 'once':
      return 1;

    default:
      return 0;
  }
}

// Returns the Monday of the week containing d (Mon-based weeks)
function mondayOf(d: Date): Date {
  const dt = new Date(d);
  dt.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  dt.setHours(0, 0, 0, 0);
  return dt;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd server && npm test -- --testPathPattern=milestone-utils.test
```

Expected: All 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/milestone-utils.ts server/src/__tests__/milestone-utils.test.ts
git commit -m "feat: add computeExpectedSessions utility with tests"
```

---

## Task 4: Backend — Stats Shaping Update

**Files:**
- Modify: `server/src/services/buddy.service.ts`
- Modify: `server/src/__tests__/setup/db-helpers.ts`
- Modify: `server/src/__tests__/buddies.test.ts`

- [ ] **Step 1: Update `seedMilestone` in `server/src/__tests__/setup/db-helpers.ts`**

Replace `seedMilestone`:

```typescript
export async function seedMilestone(goalId: string, userId: string, overrides: {
  title?: string;
  frequency?: string;
  scheduleMode?: string;
  startDate?: string;
  endDate?: string;
} = {}) {
  const { rows } = await testPool.query(
    `INSERT INTO milestones (goal_id, user_id, title, frequency, schedule_mode, start_date, end_date)
     VALUES ($1, $2, $3, $4::milestone_frequency, $5, $6::date, $7::date)
     RETURNING *`,
    [
      goalId,
      userId,
      overrides.title ?? 'Test Milestone',
      overrides.frequency ?? 'daily',
      overrides.scheduleMode ?? 'open_ended',
      overrides.startDate ?? null,
      overrides.endDate ?? null,
    ]
  );
  return rows[0];
}
```

- [ ] **Step 2: Write failing test for finite stats**

Append to `server/src/__tests__/buddies.test.ts`:

```typescript
describe('GET /buddies/:id/goal-stats — finite milestone', () => {
  it('includes finite stats when time_bound has an end_date', async () => {
    const user = await seedUser();
    const buddy = await seedUser();
    const goal = await seedGoal(buddy.id, { isPublic: true });
    await seedMilestone(goal.id, buddy.id, {
      frequency: 'daily',
      scheduleMode: 'time_bound',
      startDate: '2026-05-01',
      endDate: '2026-05-30',
    });
    const conn = await seedConnection(user.id, buddy.id, goal.id, { status: 'accepted' });
    const res = await request(app)
      .get(`/buddies/${conn.id}/goal-stats`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    const stat = res.body.milestone_stats[0];
    expect(stat.schedule_mode).toBe('time_bound');
    expect(stat.start_date).toBe('2026-05-01');
    expect(stat.end_date).toBe('2026-05-30');
    expect(stat.total_expected_finite).toBe(30); // 30 days
    expect(stat.sessions_remaining).toBe(30);    // no logs yet
    expect(stat.percent_complete).toBe(0);
  });

  it('does not include finite stats for open_ended milestone', async () => {
    const user = await seedUser();
    const buddy = await seedUser();
    const goal = await seedGoal(buddy.id, { isPublic: true });
    await seedMilestone(goal.id, buddy.id, { frequency: 'daily' }); // open_ended default
    const conn = await seedConnection(user.id, buddy.id, goal.id, { status: 'accepted' });
    const res = await request(app)
      .get(`/buddies/${conn.id}/goal-stats`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    const stat = res.body.milestone_stats[0];
    expect(stat.total_expected_finite).toBeUndefined();
    expect(stat.percent_complete).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
cd server && npm test -- --testPathPattern=buddies.test
```

Expected: FAIL on the new `describe` blocks.

- [ ] **Step 4: Update `getStats` in `server/src/services/buddy.service.ts`**

Add import at top of file (after existing imports):
```typescript
import { computeExpectedSessions } from '../lib/milestone-utils';
```

Replace the milestone query inside `getStats` (the one at line ~287 that selects `m.id, m.title, m.frequency, m.created_at::date`):

```typescript
const msResult = await query(
  `SELECT m.id, m.title, m.frequency, m.days_per_week, m.custom_days,
          m.created_at::date AS created_date,
          m.schedule_mode,
          m.start_date::text AS start_date,
          m.end_date::text AS end_date
   FROM milestones m
   WHERE m.goal_id = $1 AND m.user_id = $2 AND m.frequency != 'once'
   ORDER BY m.created_at`,
  [goalId, goalOwnerId]
);
```

Replace the per-milestone computation block (inside `Promise.all`) with:

```typescript
const milestoneStats = await Promise.all(msResult.rows.map(async (ms: any) => {
  const logsResult = await query(
    `SELECT period_start::text FROM milestone_logs WHERE milestone_id = $1 AND user_id = $2 ORDER BY period_start ASC`,
    [ms.id, goalOwnerId]
  );
  const logs: string[] = logsResult.rows.map((r: any) => r.period_start);
  const logSet = new Set(logs);

  const now = new Date(); now.setHours(0, 0, 0, 0);

  // Use start_date for time_bound milestones; fall back to created_at date
  const trackingStart = (ms.schedule_mode === 'time_bound' && ms.start_date)
    ? new Date(ms.start_date)
    : new Date(ms.created_date);
  trackingStart.setHours(0, 0, 0, 0);

  // Streak: walk backwards from now through consecutive completed periods
  let startDate = new Date(now);
  if (!logSet.has(getPeriodKey(now, ms.frequency))) startDate = prevPeriod(now, ms.frequency);
  let streak = 0;
  let checkDate = new Date(startDate);
  while (checkDate >= trackingStart && logSet.has(getPeriodKey(checkDate, ms.frequency))) {
    streak++;
    checkDate = prevPeriod(checkDate, ms.frequency);
  }

  // Open-ended total expected (periods from trackingStart to last completed period)
  const lastCompletedPeriod = prevPeriod(now, ms.frequency);
  let totalExpected = 0;
  if (ms.frequency === 'daily') {
    totalExpected = Math.max(0, Math.floor((lastCompletedPeriod.getTime() - trackingStart.getTime()) / 86400000) + 1);
  } else if (ms.frequency === 'weekly') {
    const cw = new Date(trackingStart); cw.setDate(trackingStart.getDate() - ((trackingStart.getDay() + 6) % 7));
    const lw = new Date(lastCompletedPeriod); lw.setDate(lastCompletedPeriod.getDate() - ((lastCompletedPeriod.getDay() + 6) % 7));
    totalExpected = Math.max(0, Math.floor((lw.getTime() - cw.getTime()) / (7 * 86400000)) + 1);
  } else {
    const cm = new Date(trackingStart.getFullYear(), trackingStart.getMonth(), 1);
    const lm = new Date(lastCompletedPeriod.getFullYear(), lastCompletedPeriod.getMonth(), 1);
    totalExpected = Math.max(0, (lm.getFullYear() - cm.getFullYear()) * 12 + (lm.getMonth() - cm.getMonth()) + 1);
  }

  const totalCompleted = Math.min(logs.length, totalExpected);
  const completionRate = totalExpected > 0 ? totalCompleted / totalExpected : 0;

  // Finite stats — only for time_bound milestones with an end_date
  let finiteFields: Record<string, number> = {};
  if (ms.schedule_mode === 'time_bound' && ms.end_date) {
    const totalExpectedFinite = computeExpectedSessions(
      ms.frequency,
      ms.days_per_week ?? null,
      ms.custom_days ?? null,
      trackingStart,
      new Date(ms.end_date),
    );
    finiteFields = {
      total_expected_finite: totalExpectedFinite,
      sessions_remaining: Math.max(0, totalExpectedFinite - logs.length),
      percent_complete: totalExpectedFinite > 0
        ? Math.round((logs.length / totalExpectedFinite) * 1000) / 1000
        : 0,
    };
  }

  return {
    id: ms.id,
    title: ms.title,
    frequency: ms.frequency,
    schedule_mode: ms.schedule_mode,
    start_date: ms.start_date ?? null,
    end_date: ms.end_date ?? null,
    streak,
    total_completed: totalCompleted,
    total_expected: totalExpected,
    completion_rate: Math.round(completionRate * 1000) / 1000,
    skip_rate: Math.round((1 - completionRate) * 1000) / 1000,
    ...finiteFields,
  };
}));
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
cd server && npm test -- --testPathPattern=buddies.test
```

Expected: All tests pass including the two new finite-stats tests.

- [ ] **Step 6: Commit**

```bash
git add server/src/services/buddy.service.ts server/src/__tests__/setup/db-helpers.ts server/src/__tests__/buddies.test.ts
git commit -m "feat: add finite stats to goal-stats when milestone has end_date"
```

---

## Task 5: Shared + Mobile Types

**Files:**
- Modify: `shared/types/index.ts`
- Modify: `mobile/features/goals/types.ts`

- [ ] **Step 1: Add schedule fields to `shared/types/index.ts`**

Replace the `Milestone` interface:

```typescript
export interface Milestone {
  id: string;
  goal_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed_at: string | null;
  frequency: MilestoneFrequency;
  days_per_week?: number;
  custom_days?: string;
  is_done_this_period: boolean;
  goal_title: string;
  goal_category: string;
  schedule_mode: 'open_ended' | 'time_bound';
  start_date: string | null;
  end_date: string | null;
}
```

- [ ] **Step 2: Update `Milestone` type in `mobile/features/goals/types.ts`**

Replace the `Milestone` type:

```typescript
export type Milestone = {
  id: string;
  goal_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed_at: string | null;
  frequency: MilestoneFrequency;
  days_per_week?: number;
  custom_days?: string;
  is_done_this_period: boolean;
  goal_title: string;
  goal_category: string;
  schedule_mode: 'open_ended' | 'time_bound';
  start_date: string | null;
  end_date: string | null;
};
```

- [ ] **Step 3: Extend `MilestoneStats` in `mobile/features/goals/types.ts`**

Replace the `MilestoneStats` type:

```typescript
export type MilestoneStats = {
  id: string;
  title: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  schedule_mode: 'open_ended' | 'time_bound';
  start_date: string | null;
  end_date: string | null;
  streak: number;
  total_completed: number;
  total_expected: number;
  completion_rate: number;
  // Only present for time_bound milestones with an end_date:
  total_expected_finite?: number;
  sessions_remaining?: number;
  percent_complete?: number;
};
```

- [ ] **Step 4: Commit**

```bash
git add shared/types/index.ts mobile/features/goals/types.ts
git commit -m "feat: add schedule_mode, start_date, end_date to Milestone types; extend MilestoneStats with finite fields"
```

---

## Task 6: FrequencyPickerModal — Schedule Section

**Files:**
- Modify: `mobile/features/goals/components/FrequencyPickerModal.tsx`

This task replaces the entire file. The new version adds:
- `scheduleMode`, `startDate`, `endDate`, `noEndDate` props
- `onScheduleChange` callback
- A Schedule section below the frequency options (mode toggle + date inputs)

- [ ] **Step 1: Replace `mobile/features/goals/components/FrequencyPickerModal.tsx`**

```tsx
import { useMemo } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FS, FW, LH } from '../../../theme/typography';
import { useThemeStore } from '../../../store/themeStore';
import type { ColorPalette } from '../../../lib/constants';
import type { MilestoneFrequency } from '../types';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_NUMBERS = [1, 2, 3, 4, 5, 6, 7];

const FREQUENCIES: { key: MilestoneFrequency; label: string; hint?: string }[] = [
  { key: 'daily',       label: 'Daily' },
  { key: 'x_weekly',   label: 'X days / week', hint: 'Pick 1–6' },
  { key: 'weekly',     label: 'Weekly' },
  { key: 'monthly',    label: 'Monthly' },
  { key: 'custom_days', label: 'Custom days', hint: 'Pick days' },
  { key: 'once',       label: 'Once' },
];

interface Props {
  visible: boolean;
  frequency: MilestoneFrequency;
  daysPerWeek: number;
  customDays: number[];
  scheduleMode: 'open_ended' | 'time_bound';
  startDate: string;   // 'YYYY-MM-DD' or ''
  endDate: string;     // 'YYYY-MM-DD' or ''
  noEndDate: boolean;
  onSelect: (freq: MilestoneFrequency, daysPerWeek: number, customDays: number[]) => void;
  onScheduleChange: (
    mode: 'open_ended' | 'time_bound',
    startDate: string,
    endDate: string,
    noEndDate: boolean,
  ) => void;
  onClose: () => void;
}

export function FrequencyPickerModal({
  visible,
  frequency,
  daysPerWeek,
  customDays,
  scheduleMode,
  startDate,
  endDate,
  noEndDate,
  onSelect,
  onScheduleChange,
  onClose,
}: Props) {
  const colors = useThemeStore((s) => s.colors);
  const s = useMemo(() => makeStyles(colors), [colors]);

  const endDateError = !!(endDate && startDate && endDate < startDate);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <Text style={s.title}>Frequency</Text>
          <TouchableOpacity onPress={onClose} style={[s.closeBtn, { backgroundColor: colors.card }]}>
            <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.content}>
          {/* Frequency options */}
          {FREQUENCIES.map((item) => {
            const selected = frequency === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  s.option,
                  {
                    backgroundColor: selected ? colors.primary : colors.card,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => onSelect(item.key, daysPerWeek, customDays)}
                activeOpacity={0.8}
              >
                <Text style={[s.optionText, { color: selected ? '#fff' : colors.text }]}>{item.label}</Text>
                {item.hint && !selected && (
                  <Text style={[s.optionHint, { color: colors.textSecondary }]}>{item.hint}</Text>
                )}
                {selected && <MaterialCommunityIcons name="check" size={18} color="#fff" />}
              </TouchableOpacity>
            );
          })}

          {/* x_weekly sub-picker */}
          {frequency === 'x_weekly' && (
            <View style={[s.subPicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[s.subPickerLabel, { color: colors.text }]}>Days per week</Text>
              <View style={s.chipRow}>
                {[1, 2, 3, 4, 5, 6].map((n) => {
                  const sel = daysPerWeek === n;
                  return (
                    <TouchableOpacity
                      key={n}
                      style={[s.chip, { backgroundColor: sel ? colors.primary : colors.background, borderColor: sel ? colors.primary : colors.border }]}
                      onPress={() => onSelect('x_weekly', n, customDays)}
                    >
                      <Text style={[s.chipText, { color: sel ? '#fff' : colors.text }]}>{n}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* custom_days sub-picker */}
          {frequency === 'custom_days' && (
            <View style={[s.subPicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[s.subPickerLabel, { color: colors.text }]}>Pick days</Text>
              <View style={s.chipRow}>
                {DAY_NUMBERS.map((n, index) => {
                  const sel = customDays.includes(n);
                  return (
                    <TouchableOpacity
                      key={n}
                      style={[s.chip, { backgroundColor: sel ? colors.primary : colors.background, borderColor: sel ? colors.primary : colors.border }]}
                      onPress={() => {
                        const next = sel
                          ? customDays.filter((day) => day !== n)
                          : [...customDays, n].sort((a, b) => a - b);
                        onSelect('custom_days', daysPerWeek, next);
                      }}
                    >
                      <Text style={[s.chipText, { color: sel ? '#fff' : colors.text }]}>{DAY_LABELS[index]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Schedule section */}
          <View style={[s.scheduleSection, { borderColor: colors.border }]}>
            <Text style={[s.scheduleSectionLabel, { color: colors.text }]}>Schedule</Text>

            {/* Open-ended / Time-bound toggle */}
            <View style={[s.modeToggle, { backgroundColor: colors.background, borderColor: colors.border }]}>
              {(['open_ended', 'time_bound'] as const).map((mode) => {
                const active = scheduleMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[s.modeBtn, active && { backgroundColor: colors.primary }]}
                    onPress={() => onScheduleChange(mode, startDate, endDate, noEndDate)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.modeBtnText, { color: active ? '#fff' : colors.textSecondary }]}>
                      {mode === 'open_ended' ? 'Open-ended' : 'Time-bound'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {scheduleMode === 'time_bound' && (
              <>
                {/* Start date */}
                <View style={[s.dateRow, { borderBottomColor: colors.border }]}>
                  <Text style={[s.dateLabel, { color: colors.text }]}>Start date</Text>
                  <TextInput
                    style={[s.dateInput, { color: colors.text, borderColor: colors.border }]}
                    value={startDate}
                    onChangeText={(v) => onScheduleChange('time_bound', v, endDate, noEndDate)}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                  />
                </View>

                {/* No end date toggle */}
                <TouchableOpacity
                  style={[s.dateRow, { borderBottomColor: colors.border }]}
                  onPress={() => onScheduleChange('time_bound', startDate, endDate, !noEndDate)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.dateLabel, { color: colors.text }]}>No end date</Text>
                  <View style={[s.toggle, { backgroundColor: noEndDate ? colors.primary : colors.border }]}>
                    <View style={[s.toggleThumb, noEndDate && s.toggleThumbOn]} />
                  </View>
                </TouchableOpacity>

                {/* End date (hidden when no-end-date is on) */}
                {!noEndDate && (
                  <View style={[s.dateRow, { borderBottomWidth: 0 }]}>
                    <Text style={[s.dateLabel, { color: colors.text }]}>End date</Text>
                    <TextInput
                      style={[
                        s.dateInput,
                        { color: colors.text, borderColor: endDateError ? '#EF4444' : colors.border },
                      ]}
                      value={endDate}
                      onChangeText={(v) => onScheduleChange('time_bound', startDate, v, noEndDate)}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numbers-and-punctuation"
                      maxLength={10}
                    />
                  </View>
                )}

                {endDateError && (
                  <Text style={s.dateError}>End date must be on or after start date</Text>
                )}
              </>
            )}
          </View>

          <TouchableOpacity style={[s.doneBtn, { backgroundColor: colors.primary }]} onPress={onClose}>
            <Text style={s.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: FS.section, lineHeight: LH.section, fontWeight: FW.bold, color: colors.text },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 8, paddingBottom: 32 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionText: { fontSize: FS.body, lineHeight: LH.body, fontWeight: FW.medium },
  optionHint: { fontSize: FS.caption, lineHeight: LH.caption },
  subPicker: { borderRadius: 12, padding: 14, gap: 10, borderWidth: 1 },
  subPickerLabel: { fontSize: FS.secondary, lineHeight: LH.secondary, fontWeight: FW.semibold },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    width: 40, height: 40, borderRadius: 8, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  chipText: { fontSize: FS.secondary, fontWeight: FW.semibold },
  // Schedule section
  scheduleSection: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 12 },
  scheduleSectionLabel: { fontSize: FS.secondary, lineHeight: LH.secondary, fontWeight: FW.semibold },
  modeToggle: {
    flexDirection: 'row', borderRadius: 8, borderWidth: 1, overflow: 'hidden',
  },
  modeBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 7 },
  modeBtnText: { fontSize: FS.secondary, lineHeight: LH.secondary, fontWeight: FW.medium },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1,
  },
  dateLabel: { fontSize: FS.secondary, lineHeight: LH.secondary, fontWeight: FW.medium },
  dateInput: {
    fontSize: FS.secondary, borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, minWidth: 110, textAlign: 'right',
  },
  dateError: { fontSize: FS.caption, color: '#EF4444' },
  toggle: { width: 40, height: 22, borderRadius: 11, justifyContent: 'center', paddingHorizontal: 2 },
  toggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
  toggleThumbOn: { alignSelf: 'flex-end' },
  doneBtn: { marginTop: 8, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  doneBtnText: { fontSize: FS.body, lineHeight: LH.body, fontWeight: FW.bold, color: '#fff' },
});
```

- [ ] **Step 2: Commit**

```bash
git add mobile/features/goals/components/FrequencyPickerModal.tsx
git commit -m "feat: add schedule section (open-ended / time-bound + date inputs) to FrequencyPickerModal"
```

---

## Task 7: GoalsScreen + api.ts — Wire Up Schedule Fields

**Files:**
- Modify: `mobile/features/goals/api.ts`
- Modify: `mobile/features/goals/screens/GoalsScreen.tsx`

- [ ] **Step 1: Update `createMilestone` in `mobile/features/goals/api.ts`**

Replace the `createMilestone` export:

```typescript
export const createMilestone = (
  goalId: string,
  title: string,
  frequency: Milestone['frequency'],
  daysPerWeek?: number,
  customDays?: string,
  scheduleMode?: 'open_ended' | 'time_bound',
  startDate?: string,
  endDate?: string,
): Promise<Milestone> =>
  apiFetch('/milestones', {
    method: 'POST',
    body: JSON.stringify({ goalId, title, frequency, daysPerWeek, customDays, scheduleMode, startDate, endDate }),
  });
```

- [ ] **Step 2: Add schedule state in `mobile/features/goals/screens/GoalsScreen.tsx`**

After the existing `const [showFreqPicker, setShowFreqPicker] = useState(false);` line, add:

```typescript
const [msScheduleMode, setMsScheduleMode] = useState<'open_ended' | 'time_bound'>('open_ended');
const [msStartDate, setMsStartDate] = useState('');
const [msEndDate, setMsEndDate] = useState('');
const [msNoEndDate, setMsNoEndDate] = useState(false);
```

- [ ] **Step 3: Update `draftMilestones` state type**

Replace the `draftMilestones` useState line:

```typescript
const [draftMilestones, setDraftMilestones] = useState<Array<{
  id: string;
  title: string;
  frequency: Milestone['frequency'];
  daysPerWeek?: number;
  customDays?: string;
  scheduleMode: 'open_ended' | 'time_bound';
  startDate: string;
  endDate: string;
  noEndDate: boolean;
}>>([]);
```

- [ ] **Step 4: Update `handleCloseAdd` to reset schedule state**

Add four resets to the end of the `handleCloseAdd` callback body (before the closing `}`):

```typescript
setMsScheduleMode('open_ended'); setMsStartDate(''); setMsEndDate(''); setMsNoEndDate(false);
```

- [ ] **Step 5: Update the add-milestone `onPress` handler**

Find the `onPress` for the add/update milestone button (the `TouchableOpacity` with `s.msDraftAddBtn`). Replace the inner logic:

```typescript
onPress={() => {
  if (!msTitle.trim()) return;
  const customDaysStr = msFreq === 'custom_days'
    ? [...msCustomDays].sort((a, b) => a - b).join(',')
    : undefined;
  const effectiveEndDate = msNoEndDate ? '' : msEndDate;

  if (msEditingId) {
    setDraftMilestones((prev) =>
      prev.map((m) =>
        m.id === msEditingId
          ? {
              ...m,
              title: msTitle.trim(),
              frequency: msFreq,
              daysPerWeek: msFreq === 'x_weekly' ? msDaysPerWeek : undefined,
              customDays: customDaysStr,
              scheduleMode: msScheduleMode,
              startDate: msStartDate,
              endDate: effectiveEndDate,
              noEndDate: msNoEndDate,
            }
          : m
      )
    );
    setMsEditingId(null);
  } else {
    setDraftMilestones((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        title: msTitle.trim(),
        frequency: msFreq,
        daysPerWeek: msFreq === 'x_weekly' ? msDaysPerWeek : undefined,
        customDays: customDaysStr,
        scheduleMode: msScheduleMode,
        startDate: msStartDate,
        endDate: effectiveEndDate,
        noEndDate: msNoEndDate,
      },
    ]);
  }

  setMsTitle('');
  setMsFreq('daily');
  setMsDaysPerWeek(3);
  setMsCustomDays([1, 2, 3, 4, 5]);
  setMsScheduleMode('open_ended');
  setMsStartDate('');
  setMsEndDate('');
  setMsNoEndDate(false);
}}
```

- [ ] **Step 6: Update the edit-milestone `onPress` in the draft row**

Find the pencil button's `onPress` (inside `draftMilestones.map`). Replace with:

```typescript
onPress={() => {
  setMsTitle(ms.title);
  setMsFreq(ms.frequency);
  setMsDaysPerWeek(ms.daysPerWeek ?? 3);
  setMsCustomDays(ms.customDays ? ms.customDays.split(',').map(Number) : [1, 2, 3, 4, 5]);
  setMsScheduleMode(ms.scheduleMode);
  setMsStartDate(ms.startDate);
  setMsEndDate(ms.endDate);
  setMsNoEndDate(ms.noEndDate);
  setMsEditingId(ms.id);
}}
```

- [ ] **Step 7: Add schedule summary to draft milestone rows**

Add the `formatScheduleSummary` helper function just above the component definition (before `export function GoalsScreen`). Add it as a module-level function:

```typescript
function formatScheduleSummary(
  scheduleMode: 'open_ended' | 'time_bound',
  startDate: string,
  endDate: string,
): string {
  if (scheduleMode !== 'time_bound' || !startDate) return 'Open-ended';
  const start = new Date(startDate + 'T00:00:00');
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (!endDate) return `Starts ${startStr}`;
  const end = new Date(endDate + 'T00:00:00');
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${startStr} – ${endStr}`;
}
```

In the `draftMilestones.map` render, replace the title `Text` with a wrapped column:

```tsx
<View style={{ flex: 1 }}>
  <Text style={[s.msDraftTitle, { color: colors.text }]} numberOfLines={1}>{ms.title}</Text>
  <Text style={[s.msDraftSchedule, { color: colors.textSecondary }]}>
    {formatScheduleSummary(ms.scheduleMode, ms.startDate, ms.endDate)}
  </Text>
</View>
```

Add `msDraftSchedule` to `makeStyles`:

```typescript
msDraftSchedule: { fontSize: FS.caption, lineHeight: LH.caption, marginTop: 2 },
```

- [ ] **Step 8: Update `createMilestoneApi` call in `handleAddGoal`**

Replace the existing `createMilestoneApi(newGoal.id, ms.title, ms.frequency, ms.daysPerWeek, ms.customDays)` call with:

```typescript
createMilestoneApi(
  newGoal.id,
  ms.title,
  ms.frequency,
  ms.daysPerWeek,
  ms.customDays,
  ms.scheduleMode,
  ms.startDate || undefined,
  ms.noEndDate ? undefined : (ms.endDate || undefined),
)
```

- [ ] **Step 9: Update `FrequencyPickerModal` JSX to pass new props**

Replace the `<FrequencyPickerModal ... />` JSX:

```tsx
<FrequencyPickerModal
  visible={showFreqPicker}
  frequency={msFreq}
  daysPerWeek={msDaysPerWeek}
  customDays={msCustomDays}
  scheduleMode={msScheduleMode}
  startDate={msStartDate}
  endDate={msEndDate}
  noEndDate={msNoEndDate}
  onSelect={(freq, dpw, cd) => {
    setMsFreq(freq);
    setMsDaysPerWeek(dpw);
    setMsCustomDays(cd);
  }}
  onScheduleChange={(mode, sd, ed, nEd) => {
    setMsScheduleMode(mode);
    setMsStartDate(sd);
    setMsEndDate(ed);
    setMsNoEndDate(nEd);
  }}
  onClose={() => setShowFreqPicker(false)}
/>
```

- [ ] **Step 10: Remove coop hint view and fix `* required` layout**

Find the coop toggle section (the `{newIsPublic ? (...coop toggle...) : (<View style={s.coopHiddenHint}>...</View>)}` conditional). Replace the entire conditional with just the coop toggle, guarded by `newIsPublic`:

```tsx
{newIsPublic && (
  <TouchableOpacity
    style={[s.publicRow, { backgroundColor: colors.card, borderColor: newCoopOpen ? colors.primary : colors.border }]}
    onPress={() => setNewCoopOpen((v) => !v)}
    activeOpacity={0.8}
  >
    <MaterialCommunityIcons
      name="account-multiple-outline"
      size={20}
      color={newCoopOpen ? colors.primary : colors.textSecondary}
    />
    <View style={{ flex: 1 }}>
      <Text style={[s.publicLabel, { color: colors.text }]}>Co-op Goal</Text>
      <Text style={[s.publicSub, { color: colors.textSecondary }]}>
        {newCoopOpen ? 'You and a buddy work on this goal together' : 'Share ownership of this goal with a buddy'}
      </Text>
    </View>
    <View style={[s.toggle, { backgroundColor: newCoopOpen ? colors.primary : colors.border }]}>
      <View style={[s.toggleThumb, newCoopOpen && s.toggleThumbOn]} />
    </View>
  </TouchableOpacity>
)}
```

Find the milestones section header. Replace `<View style={s.msSectionHeaderLeft}>` (and its closing tag that wraps the two Text elements) with a plain `<View>`:

```tsx
<View style={s.msSectionHeader}>
  <View>
    <Text style={[s.inputLabel, { color: colors.text, marginTop: 0 }]}>Milestones</Text>
    <Text style={s.msRequired}>* required</Text>
  </View>
  <Text style={[s.msAtLeast, { color: colors.textSecondary }]}>at least 1</Text>
</View>
```

- [ ] **Step 11: Commit**

```bash
git add mobile/features/goals/api.ts mobile/features/goals/screens/GoalsScreen.tsx
git commit -m "feat: wire schedule fields through GoalsScreen and api; remove coop hint; stack milestone * required label"
```

---

## Full Test Run

- [ ] **Run all server tests**

```bash
cd server && npm test
```

Expected: All tests pass.

- [ ] **Verify app on emulators**

Open a new goal form on both emulators. Tap the frequency row for a milestone. In the picker:
- Frequency options appear at top (unchanged)
- A "Schedule" section appears below with Open-ended / Time-bound toggle
- Switching to Time-bound shows Start date and End date inputs + No end date toggle
- Setting `No end date` hides the end date input
- Setting end date < start date shows the error message

Check draft milestone rows show schedule summary (`Open-ended`, `Starts Apr 8`, or `Apr 8 – May 20`).

Verify saving a time-bound milestone reaches the server by checking the network response includes `schedule_mode`, `start_date`, `end_date`.
