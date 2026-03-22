-- ─────────────────────────────────────────────────────────────
-- Trigger: one buddy per goal enforcement
-- Rejects a new buddy_connection INSERT if the goal already
-- has an accepted connection.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION enforce_one_buddy_per_goal()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM buddy_connections
    WHERE goal_id = NEW.goal_id
      AND status = 'accepted'
      AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Goal already has an accepted buddy';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_one_buddy_per_goal
  BEFORE INSERT OR UPDATE ON buddy_connections
  FOR EACH ROW EXECUTE FUNCTION enforce_one_buddy_per_goal();

-- ─────────────────────────────────────────────────────────────
-- Trigger: auto-create pending connection on mutual like
-- When user A likes user B for goal G, check if B already
-- liked A for the same goal. If so, create a pending connection.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_mutual_like()
RETURNS TRIGGER AS $$
DECLARE
  matching_goal_id UUID;
BEGIN
  -- Only process 'like' actions
  IF NEW.action != 'like' THEN
    RETURN NEW;
  END IF;

  IF NEW.mode = 'specific' THEN
    -- Check for mutual like on same goal
    IF EXISTS (
      SELECT 1 FROM swipe_actions
      WHERE swiper_id = NEW.swiped_id
        AND swiped_id = NEW.swiper_id
        AND action = 'like'
        AND goal_id = NEW.goal_id
    ) THEN
      -- Avoid duplicate connection
      IF NOT EXISTS (
        SELECT 1 FROM buddy_connections
        WHERE goal_id = NEW.goal_id
          AND (
            (requester_id = NEW.swiper_id AND receiver_id = NEW.swiped_id)
            OR
            (requester_id = NEW.swiped_id AND receiver_id = NEW.swiper_id)
          )
      ) THEN
        INSERT INTO buddy_connections (requester_id, receiver_id, goal_id, status)
        VALUES (NEW.swiper_id, NEW.swiped_id, NEW.goal_id, 'pending');
      END IF;
    END IF;

  ELSE
    -- mode = 'any': find first overlapping goal between the two users
    SELECT sa.goal_id INTO matching_goal_id
    FROM swipe_actions sa
    JOIN goals g1 ON g1.id = sa.goal_id AND g1.user_id = NEW.swiped_id
    JOIN goals g2 ON g2.category = g1.category AND g2.user_id = NEW.swiper_id AND g2.status = 'active' AND g2.is_public = TRUE
    WHERE sa.swiper_id = NEW.swiped_id
      AND sa.swiped_id = NEW.swiper_id
      AND sa.action = 'like'
    LIMIT 1;

    IF matching_goal_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM buddy_connections
        WHERE goal_id = matching_goal_id
          AND (
            (requester_id = NEW.swiper_id AND receiver_id = NEW.swiped_id)
            OR
            (requester_id = NEW.swiped_id AND receiver_id = NEW.swiper_id)
          )
      ) THEN
        INSERT INTO buddy_connections (requester_id, receiver_id, goal_id, status)
        VALUES (NEW.swiper_id, NEW.swiped_id, matching_goal_id, 'pending');
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mutual_like
  AFTER INSERT ON swipe_actions
  FOR EACH ROW EXECUTE FUNCTION handle_mutual_like();

-- ─────────────────────────────────────────────────────────────
-- Trigger: auto-create activity_stats row on new user
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_activity_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_stats (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_new_user_stats
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_activity_stats();

-- ─────────────────────────────────────────────────────────────
-- Trigger: update activity_stats on new check-in
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_stats_on_checkin()
RETURNS TRIGGER AS $$
DECLARE
  last_checkin TIMESTAMPTZ;
  days_since INTEGER;
  current_streak_val INTEGER;
BEGIN
  SELECT last_checkin_at, current_streak
  INTO last_checkin, current_streak_val
  FROM activity_stats
  WHERE user_id = NEW.author_id;

  -- Calculate new streak
  IF last_checkin IS NULL THEN
    current_streak_val := 1;
  ELSE
    days_since := EXTRACT(DAY FROM (NOW() - last_checkin));
    IF days_since <= 1 THEN
      current_streak_val := current_streak_val + 1;
    ELSIF days_since <= 2 THEN
      -- Same streak (same day or yesterday)
      current_streak_val := current_streak_val;
    ELSE
      current_streak_val := 1;
    END IF;
  END IF;

  UPDATE activity_stats SET
    total_checkins = total_checkins + 1,
    current_streak = current_streak_val,
    longest_streak = GREATEST(longest_streak, current_streak_val),
    last_checkin_at = NOW(),
    activity_level = CASE
      WHEN NOW() - NOW() <= INTERVAL '3 days' THEN 'very_active'
      ELSE 'active'
    END,
    updated_at = NOW()
  WHERE user_id = NEW.author_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_checkin_stats
  AFTER INSERT ON check_ins
  FOR EACH ROW EXECUTE FUNCTION update_stats_on_checkin();

-- ─────────────────────────────────────────────────────────────
-- Trigger: update milestones_completed stat
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_stats_on_milestone()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
    UPDATE activity_stats SET
      milestones_completed = milestones_completed + 1,
      updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_milestone_stats
  AFTER UPDATE ON milestones
  FOR EACH ROW EXECUTE FUNCTION update_stats_on_milestone();

-- ─────────────────────────────────────────────────────────────
-- Function: update activity_level (called by cron)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_activity_levels()
RETURNS VOID AS $$
BEGIN
  UPDATE activity_stats SET
    activity_level = CASE
      WHEN last_checkin_at > NOW() - INTERVAL '3 days' THEN 'very_active'
      WHEN last_checkin_at > NOW() - INTERVAL '7 days' THEN 'active'
      WHEN last_checkin_at > NOW() - INTERVAL '14 days' THEN 'occasional'
      WHEN last_checkin_at IS NOT NULL THEN 'inactive'
      ELSE 'new'
    END,
    current_streak = CASE
      WHEN last_checkin_at < NOW() - INTERVAL '2 days' THEN 0
      ELSE current_streak
    END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
