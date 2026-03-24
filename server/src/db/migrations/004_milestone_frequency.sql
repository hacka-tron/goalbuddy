-- ─────────────────────────────────────────────────────────────
-- Migration 004: milestone frequency, milestone_logs, coop goals,
--               fix swipe constraint, connection type
-- ─────────────────────────────────────────────────────────────

-- 1. Milestone frequency
DO $$ BEGIN
  CREATE TYPE milestone_frequency AS ENUM ('once', 'daily', 'weekly', 'monthly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS frequency milestone_frequency NOT NULL DEFAULT 'once';

-- 2. Milestone logs — tracks each completion of a recurring milestone per period
CREATE TABLE IF NOT EXISTS milestone_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,   -- start of the period: the day (daily), monday of week (weekly), 1st of month (monthly)
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note        TEXT,
  UNIQUE(milestone_id, user_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_milestone_logs_milestone ON milestone_logs(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_logs_user      ON milestone_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_milestone_logs_period    ON milestone_logs(period_start);

-- 3. Goals: add coop_open flag
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS coop_open BOOLEAN NOT NULL DEFAULT FALSE;

-- 4. Fix swipe_actions UNIQUE constraint to handle NULL goal_id
--    (NULL != NULL in standard unique, so two 'any' mode swipes didn't conflict)
ALTER TABLE swipe_actions
  DROP CONSTRAINT IF EXISTS swipe_actions_swiper_id_swiped_id_goal_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_swipe_with_goal
  ON swipe_actions(swiper_id, swiped_id, goal_id)
  WHERE goal_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_swipe_no_goal
  ON swipe_actions(swiper_id, swiped_id)
  WHERE goal_id IS NULL;

-- 5. Connection type: accountability vs coop
DO $$ BEGIN
  CREATE TYPE connection_type AS ENUM ('accountability', 'coop');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE buddy_connections
  ADD COLUMN IF NOT EXISTS connection_type connection_type NOT NULL DEFAULT 'accountability';

-- receiver_goal_id: for accountability connections, the receiver's own goal they're accountable for
ALTER TABLE buddy_connections
  ADD COLUMN IF NOT EXISTS receiver_goal_id UUID REFERENCES goals(id) ON DELETE SET NULL;
