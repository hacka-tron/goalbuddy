-- ─────────────────────────────────────────────────────────────
-- Migration 006: Extended milestone frequency — x_weekly and custom_days
-- ─────────────────────────────────────────────────────────────

-- 1. Extend the milestone_frequency enum with the two new values
ALTER TYPE milestone_frequency ADD VALUE IF NOT EXISTS 'x_weekly';
ALTER TYPE milestone_frequency ADD VALUE IF NOT EXISTS 'custom_days';

-- 2. Add supporting columns to milestones
ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS days_per_week INTEGER;          -- used when frequency = 'x_weekly'

ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS custom_days TEXT;               -- used when frequency = 'custom_days', e.g. '1,3,5'
