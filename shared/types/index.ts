export interface User {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category: 'fitness' | 'learning' | 'career' | 'finance' | 'personal';
  deadline?: string;
  is_public: boolean;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ErrorResponse {
  error: string;
  code: string;
  retryable: boolean;
}
