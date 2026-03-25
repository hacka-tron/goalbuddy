-- Migration 005: performance indexes

-- Trigram extension for fast ILIKE '%...%' search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram indexes — makes ILIKE '%term%' use an index instead of seq scan
CREATE INDEX IF NOT EXISTS idx_goals_title_trgm ON goals USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_goals_desc_trgm  ON goals USING GIN (description gin_trgm_ops);

-- Partial index for the public goals discovery query (is_public=TRUE, status='active')
CREATE INDEX IF NOT EXISTS idx_goals_public_active
  ON goals(created_at DESC)
  WHERE is_public = TRUE AND status = 'active';

-- Composite index for milestones by user + goal (speeds up /milestones/me and per-goal queries)
CREATE INDEX IF NOT EXISTS idx_milestones_user_goal ON milestones(user_id, goal_id);

-- Index for buddy_connections by accepted status (speeds up feed + buddy queries)
CREATE INDEX IF NOT EXISTS idx_buddy_connections_accepted
  ON buddy_connections(requester_id, receiver_id)
  WHERE status = 'accepted';
