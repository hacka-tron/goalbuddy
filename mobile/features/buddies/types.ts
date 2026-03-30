export type DeadlineWarning = {
  milestone_id: string;
  title: string;
  frequency: string;
  deadline: string;
  percent_elapsed: number;
  hours_remaining: number;
};

export type Connection = {
  id: string;
  status: string;
  goal_title: string;
  goal_category: string;
  goal_id: string;
  buddy_id: string;
  buddy_name: string;
  buddy_avatar: string | null;
  activity_level: string;
  current_streak: number;
  last_checkin_at: string | null;
  connection_type: string;
  overdue_count: number;
  late_today_count: number;
  total_checkins: number;
  milestones_completed: number;
  response_rate: number;
  is_incoming: boolean;
  is_my_goal: boolean;
  is_last_message_mine: boolean | null;
  last_message_at: string | null;
  deadline_warnings: DeadlineWarning[];
};

export type BuddyGroup = {
  buddy_id: string;
  buddy_name: string;
  buddy_avatar: string | null;
  activity_level: string;
  connections: Connection[];
  has_overdue: boolean;
};

export type TabKey = 'my_goals' | 'coaching' | 'coop';
