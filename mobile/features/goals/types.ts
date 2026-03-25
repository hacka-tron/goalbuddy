export type Goal = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  target_date: string | null;
  status: string;
  is_public: boolean;
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
  frequency: 'once' | 'daily' | 'weekly' | 'monthly';
  is_done_this_period: boolean;
  goal_title: string;
  goal_category: string;
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
  has_buddy: boolean;
  my_request_status: string | null;
};

export type MsFilter = 'today' | 'week' | 'month' | 'all';
