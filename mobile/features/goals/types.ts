export type MilestoneFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'x_weekly' | 'custom_days';

export type Goal = {
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
};

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

export type PublicGoal = {
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
};

export type MsFilter = 'today' | 'week' | 'month' | 'all';

export type MilestoneStats = {
  id: string;
  title: string;
  frequency: MilestoneFrequency;
  schedule_mode: 'open_ended' | 'time_bound';
  start_date: string | null;
  end_date: string | null;
  streak: number;
  total_completed: number;
  total_expected: number;
  completion_rate: number;
  total_expected_finite?: number;
  sessions_remaining?: number;
  percent_complete?: number;
};
