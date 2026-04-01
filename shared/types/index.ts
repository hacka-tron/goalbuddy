// Shared contract types — kept in sync with server responses and mobile consumers.

export interface User {
  id: string;
  email: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  theme: string;
  notification_frequency: string;
  created_at: string;
}

export interface Goal {
  id: string;
  title: string;
  category: string;
  description: string | null;
  target_date: string | null;
  status: string;
  is_public: boolean;
  coop_open: boolean;
  connection_id: string | null;
  connection_status: string | null;
  buddy_name: string | null;
  buddy_activity_level: string | null;
  has_pending_request: boolean;
}

export interface PublicGoal {
  id: string;
  title: string;
  category: string;
  description: string | null;
  user_id: string;
  display_name: string;
  username: string;
  activity_level: string;
  current_streak: number;
  milestone_count: number;
  coop_open: boolean;
  has_buddy: boolean;
  my_request_status: string | null;
}

export type MilestoneFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'x_weekly' | 'custom_days';

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

export interface ErrorResponse {
  error: string;
  code: string;
  retryable: boolean;
}
