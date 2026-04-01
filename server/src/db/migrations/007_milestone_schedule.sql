-- Migration 007: Milestone schedule mode (open_ended / time_bound)

ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS schedule_mode TEXT NOT NULL DEFAULT 'open_ended';

ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS start_date DATE;

ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS end_date DATE;
