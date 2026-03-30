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
  goal_title: string;
  goal_category: string;
  goal_id: string;
  buddy_id: string;
  buddy_name: string;
  buddy_avatar: string | null;
  activity_level: string;
  connection_type: string;
  overdue_count: number;
  late_today_count: number;
  is_my_goal: boolean;
  deadline_warnings: DeadlineWarning[];
};

export type CheckIn = {
  id: string;
  author_id: string;
  message: string;
  mood: string;
  display_name: string;
  created_at: string;
  milestone_title: string | null;
  syncStatus?: 'pending' | 'sent' | 'failed';
};

export type CheckInsPage = {
  messages: CheckIn[];
  hasMore: boolean;
  nextCursor: string | null;
};
