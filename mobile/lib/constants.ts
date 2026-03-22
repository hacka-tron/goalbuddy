export const COLORS = {
  background: '#F9F7F4',
  card: '#FFFFFF',
  primary: '#6A9E7F',
  primaryLight: '#E8F5EE',
  accent: '#E8806A',
  accentLight: '#FDECEA',
  text: '#2C2C2C',
  textSecondary: '#8A8A8A',
  border: '#EDEBE8',
  shadow: 'rgba(0,0,0,0.06)',
  white: '#FFFFFF',
  success: '#6A9E7F',
  warning: '#F0B429',
  error: '#E8806A',
};

export const GOAL_CATEGORIES = [
  { key: 'workout', label: 'Workout', icon: '💪' },
  { key: 'study', label: 'Study', icon: '📚' },
  { key: 'career', label: 'Career', icon: '🚀' },
  { key: 'health', label: 'Health', icon: '🥗' },
  { key: 'creative', label: 'Creative', icon: '🎨' },
  { key: 'finance', label: 'Finance', icon: '💰' },
  { key: 'social', label: 'Social', icon: '🤝' },
  { key: 'other', label: 'Other', icon: '✨' },
] as const;

export const MOODS = [
  { key: 'great', label: 'Great', emoji: '🔥' },
  { key: 'good', label: 'Good', emoji: '😊' },
  { key: 'struggling', label: 'Struggling', emoji: '😤' },
  { key: 'blocked', label: 'Blocked', emoji: '😔' },
] as const;

export const ACTIVITY_LEVELS: Record<string, { label: string; color: string }> = {
  very_active: { label: 'Very Active', color: '#6A9E7F' },
  active: { label: 'Active', color: '#F0B429' },
  occasional: { label: 'Occasional', color: '#8A8A8A' },
  inactive: { label: 'Inactive', color: '#E8806A' },
  new: { label: 'New', color: '#8A8A8A' },
};
