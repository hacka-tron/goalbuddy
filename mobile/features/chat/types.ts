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
