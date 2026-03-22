-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  google_id TEXT UNIQUE,
  display_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  theme TEXT NOT NULL DEFAULT 'system',
  push_token TEXT,
  notification_frequency TEXT NOT NULL DEFAULT 'daily',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Goal categories
CREATE TYPE goal_category AS ENUM (
  'workout', 'study', 'career', 'health', 'creative', 'finance', 'social', 'other'
);

-- Goal status
CREATE TYPE goal_status AS ENUM ('active', 'completed', 'paused');

-- Goals table
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category goal_category NOT NULL,
  description TEXT,
  target_date DATE,
  status goal_status NOT NULL DEFAULT 'active',
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Buddy connections (one per goal)
CREATE TYPE connection_status AS ENUM ('pending', 'accepted', 'declined', 'blocked');

CREATE TABLE buddy_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  status connection_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(requester_id, receiver_id, goal_id),
  CHECK (requester_id != receiver_id)
);

-- Milestones
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  ai_suggested BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Check-ins
CREATE TYPE mood_type AS ENUM ('great', 'good', 'struggling', 'blocked');

CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES buddy_connections(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  mood mood_type NOT NULL,
  milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Swipe actions
CREATE TYPE swipe_action AS ENUM ('like', 'pass');
CREATE TYPE matching_mode AS ENUM ('specific', 'any');

CREATE TABLE swipe_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  swiper_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  swiped_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action swipe_action NOT NULL,
  mode matching_mode NOT NULL,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(swiper_id, swiped_id, goal_id),
  CHECK (swiper_id != swiped_id)
);

-- Activity stats (one row per user, updated via triggers/cron)
CREATE TABLE activity_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  total_checkins INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  milestones_completed INTEGER NOT NULL DEFAULT 0,
  response_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  last_checkin_at TIMESTAMPTZ,
  activity_level TEXT NOT NULL DEFAULT 'new',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_category ON goals(category);
CREATE INDEX idx_goals_is_public ON goals(is_public);
CREATE INDEX idx_buddy_connections_requester ON buddy_connections(requester_id);
CREATE INDEX idx_buddy_connections_receiver ON buddy_connections(receiver_id);
CREATE INDEX idx_buddy_connections_goal ON buddy_connections(goal_id);
CREATE INDEX idx_check_ins_connection ON check_ins(connection_id);
CREATE INDEX idx_check_ins_author ON check_ins(author_id);
CREATE INDEX idx_swipe_actions_swiper ON swipe_actions(swiper_id);
CREATE INDEX idx_milestones_goal ON milestones(goal_id);
CREATE INDEX idx_milestones_user ON milestones(user_id);
