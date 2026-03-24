-- ─────────────────────────────────────────────────────────────
-- Seed: test users + goals + connections + milestones + check-ins
-- Password for all test users: "password123"
-- (bcrypt hash of "password123" with 12 rounds)
-- ─────────────────────────────────────────────────────────────

INSERT INTO users (id, email, password_hash, display_name, username, bio)
VALUES
  ('00000000-0000-0000-0000-000000000001',
   'alex@test.com',
   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewfBMAkXS/0yBGhK',
   'Alex Rivera',
   'alexrivera',
   'Marathon runner and side-project builder. Always chasing the next goal 🏃'),

  ('00000000-0000-0000-0000-000000000002',
   'sam@test.com',
   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewfBMAkXS/0yBGhK',
   'Sam Chen',
   'samchen',
   'CS grad student. Studying for interviews and staying fit 💪'),

  ('00000000-0000-0000-0000-000000000003',
   'jordan@test.com',
   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewfBMAkXS/0yBGhK',
   'Jordan Lee',
   'jordanlee',
   'Aspiring entrepreneur. Working on my first startup and getting healthy 🚀'),

  ('00000000-0000-0000-0000-000000000004',
   'maya@test.com',
   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewfBMAkXS/0yBGhK',
   'Maya Patel',
   'mayapatel',
   'Yoga teacher & finance nerd. Balancing mind, body, and money 🧘'),

  ('00000000-0000-0000-0000-000000000005',
   'chris@test.com',
   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewfBMAkXS/0yBGhK',
   'Chris Wong',
   'chriswong',
   'Software engineer leveling up. Gym 5x a week and reading more 📚')
ON CONFLICT (id) DO NOTHING;

-- ── Goals ────────────────────────────────────────────────────

INSERT INTO goals (id, user_id, title, category, description, target_date, status, is_public)
VALUES
  -- Alex
  ('10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'Run a half marathon', 'workout',
   'Training to complete my first half marathon', '2026-06-01', 'active', TRUE),

  ('10000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   'Ship a SaaS product', 'career',
   'Launch my first paid product', '2026-09-01', 'active', TRUE),

  -- Sam
  ('10000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000002',
   'Pass Google SWE interview', 'career',
   'LeetCode daily and system design prep', '2026-05-01', 'active', TRUE),

  ('10000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000002',
   'Go to the gym 4x a week', 'workout',
   'Build a consistent workout habit', '2026-12-31', 'active', TRUE),

  -- Jordan
  ('10000000-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000003',
   'Get promoted to Senior Engineer', 'career',
   'Lead two major projects and grow my team', '2026-12-01', 'active', TRUE),

  ('10000000-0000-0000-0000-000000000006',
   '00000000-0000-0000-0000-000000000003',
   'Lose 15 lbs and keep it off', 'health',
   'Calorie tracking and consistent cardio', '2026-07-01', 'active', TRUE),

  -- Maya
  ('10000000-0000-0000-0000-000000000007',
   '00000000-0000-0000-0000-000000000004',
   'Save $10,000 emergency fund', 'finance',
   'Automating $800/month savings', '2027-01-01', 'active', TRUE),

  ('10000000-0000-0000-0000-000000000008',
   '00000000-0000-0000-0000-000000000004',
   'Run 5K three times a week', 'workout',
   'Building cardio base for yoga practice', '2026-06-01', 'active', TRUE),

  -- Chris
  ('10000000-0000-0000-0000-000000000009',
   '00000000-0000-0000-0000-000000000005',
   'Read 24 books this year', 'study',
   '2 books per month, mix of tech and fiction', '2026-12-31', 'active', TRUE),

  ('10000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000005',
   'Bench press 225 lbs', 'workout',
   'Progressive overload program', '2026-08-01', 'active', TRUE)

ON CONFLICT (id) DO NOTHING;

-- ── Buddy Connections ─────────────────────────────────────────
-- All test users are buddied with Alex (00000000-...-001) for easy testing.
-- Log in as alex@test.com (password: password123) to see all buddy connections.

-- Alex (workout: half marathon) ↔ Sam (workout: gym 4x/week)
INSERT INTO buddy_connections (id, requester_id, receiver_id, goal_id, status, accepted_at)
VALUES
  ('20000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000001',
   'accepted',
   NOW() - INTERVAL '14 days')
ON CONFLICT DO NOTHING;

-- Alex (career: Ship SaaS) ↔ Jordan (career: Get promoted)
INSERT INTO buddy_connections (id, requester_id, receiver_id, goal_id, status, accepted_at)
VALUES
  ('20000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000002',
   'accepted',
   NOW() - INTERVAL '10 days')
ON CONFLICT DO NOTHING;

-- Alex ↔ Maya (Maya finance goal) — pending (Maya sent request)
INSERT INTO buddy_connections (id, requester_id, receiver_id, goal_id, status)
VALUES
  ('20000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000007',
   'pending')
ON CONFLICT DO NOTHING;

-- Alex ↔ Chris (Chris study goal: read 24 books)
INSERT INTO buddy_connections (id, requester_id, receiver_id, goal_id, status, accepted_at)
VALUES
  ('20000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000005',
   '10000000-0000-0000-0000-000000000009',
   'accepted',
   NOW() - INTERVAL '5 days')
ON CONFLICT DO NOTHING;

-- ── Milestones ────────────────────────────────────────────────

INSERT INTO milestones (id, goal_id, user_id, title, description, due_date, completed_at, ai_suggested)
VALUES
  -- Alex's running milestones
  ('30000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'Run 5K without stopping', 'Build base endurance',
   '2026-02-28', NOW() - INTERVAL '20 days', TRUE),

  ('30000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'Complete a 10K race', 'First official race',
   '2026-04-01', NULL, TRUE),

  ('30000000-0000-0000-0000-000000000003',
   '10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'Run 21K in training', 'Pre-race long run',
   '2026-05-15', NULL, FALSE),

  -- Sam's gym milestones
  ('30000000-0000-0000-0000-000000000004',
   '10000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000002',
   '30 consecutive days hitting the gym', 'Habit formation',
   '2026-03-31', NOW() - INTERVAL '5 days', TRUE),

  -- Sam's career milestones
  ('30000000-0000-0000-0000-000000000005',
   '10000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000002',
   'Solve 150 LeetCode problems', 'Focus on medium difficulty',
   '2026-03-15', NOW() - INTERVAL '2 days', FALSE),

  ('30000000-0000-0000-0000-000000000006',
   '10000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000002',
   'Complete system design course', 'Grokking the System Design Interview',
   '2026-04-01', NULL, TRUE),

  -- Chris's milestones
  ('30000000-0000-0000-0000-000000000007',
   '10000000-0000-0000-0000-000000000009',
   '00000000-0000-0000-0000-000000000005',
   'Read first 6 books', 'Jan–March goal',
   '2026-03-31', NULL, TRUE)

ON CONFLICT (id) DO NOTHING;

-- ── Check-ins ─────────────────────────────────────────────────

INSERT INTO check_ins (connection_id, author_id, message, mood, milestone_id, created_at)
VALUES
  -- Alex ↔ Sam check-ins (workout connection: 20000000-...-001)
  ('20000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'Just did my long run — 14km! Legs are dead but feeling great 💪',
   'great',
   NULL,
   NOW() - INTERVAL '10 days'),

  ('20000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000002',
   'Hit the gym this morning before class. Chest day done! 🏋️',
   'good',
   '30000000-0000-0000-0000-000000000004',
   NOW() - INTERVAL '9 days'),

  ('20000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'Ran 5K this morning and it finally felt easy. The training is working!',
   'great',
   '30000000-0000-0000-0000-000000000001',
   NOW() - INTERVAL '20 days'),

  ('20000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000002',
   'Skipped yesterday, feeling a bit off. Getting back on track today.',
   'struggling',
   NULL,
   NOW() - INTERVAL '5 days'),

  ('20000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'You got this! I had a rough week too. Just show up, even if it is just 20 mins.',
   'good',
   NULL,
   NOW() - INTERVAL '4 days'),

  -- Alex ↔ Jordan check-ins (career connection: 20000000-...-002)
  ('20000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000003',
   'Had my project review — my manager loved the new architecture. Feeling hopeful about the promotion!',
   'great',
   NULL,
   NOW() - INTERVAL '8 days'),

  ('20000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   'That is awesome! Keep pushing, you deserve that promo. My SaaS MVP is 60% done 🚀',
   'great',
   NULL,
   NOW() - INTERVAL '7 days'),

  ('20000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000003',
   'Got some critical feedback today. Back to the drawing board on the API design.',
   'blocked',
   NULL,
   NOW() - INTERVAL '2 days'),

  -- Alex ↔ Chris check-ins (study connection: 20000000-...-004)
  ('20000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000005',
   'Finished book #3 — Atomic Habits. Life changing stuff 📚',
   'great',
   '30000000-0000-0000-0000-000000000007',
   NOW() - INTERVAL '3 days'),

  ('20000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000001',
   'Nice! I read that last year. Next try The Power of Habit or Deep Work. Both are 🔥',
   'good',
   NULL,
   NOW() - INTERVAL '2 days'),

  ('20000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000005',
   'Started book #4 this morning. On track for 2/month 💪',
   'good',
   NULL,
   NOW() - INTERVAL '1 day');

-- ── Update activity stats manually (triggers will handle future ones) ─────

UPDATE activity_stats SET
  total_checkins = 3,
  current_streak = 7,
  longest_streak = 14,
  milestones_completed = 1,
  last_checkin_at = NOW() - INTERVAL '4 days',
  activity_level = 'active'
WHERE user_id = '00000000-0000-0000-0000-000000000001';

UPDATE activity_stats SET
  total_checkins = 3,
  current_streak = 3,
  longest_streak = 30,
  milestones_completed = 2,
  last_checkin_at = NOW() - INTERVAL '1 day',
  activity_level = 'very_active'
WHERE user_id = '00000000-0000-0000-0000-000000000002';

UPDATE activity_stats SET
  total_checkins = 2,
  current_streak = 2,
  longest_streak = 5,
  milestones_completed = 0,
  last_checkin_at = NOW() - INTERVAL '2 days',
  activity_level = 'very_active'
WHERE user_id = '00000000-0000-0000-0000-000000000003';

UPDATE activity_stats SET
  total_checkins = 0,
  current_streak = 0,
  longest_streak = 0,
  milestones_completed = 0,
  last_checkin_at = NULL,
  activity_level = 'new'
WHERE user_id = '00000000-0000-0000-0000-000000000004';

UPDATE activity_stats SET
  total_checkins = 0,
  current_streak = 0,
  longest_streak = 0,
  milestones_completed = 0,
  last_checkin_at = NULL,
  activity_level = 'new'
WHERE user_id = '00000000-0000-0000-0000-000000000005';
