export type Goal = {
  id: string;
  title: string;
  category: string;
  is_public?: boolean;
  status?: string;
  connection_id?: string;
  connection_status?: string;
};

export type Candidate = {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  goal_id?: string;
  goal_title?: string;
  category?: string;
  activity_level: string;
  current_streak: number;
  total_checkins: number;
  shared_goal_count: number;
  shared_categories?: string[];
  their_goal_titles?: string[];
};
