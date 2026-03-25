import { TextStyle } from 'react-native';

// ── Themes ────────────────────────────────────────────────────
export type ThemeKey = 'sage' | 'ocean' | 'sand' | 'rose' | 'midnight' | 'charcoal' | 'forest' | 'plum' | 'custom';

export type ColorPalette = {
  background: string;
  card: string;
  primary: string;
  primaryLight: string;
  accent: string;
  accentLight: string;
  text: string;
  textSecondary: string;
  border: string;
  white: string;
};

export const THEMES: Record<Exclude<ThemeKey, 'custom'>, { name: string; dark: boolean; colors: ColorPalette }> = {
  // ── Light ──
  sage: {
    name: 'Sage', dark: false,
    colors: {
      background: '#F9F7F4', card: '#FFFFFF',
      primary: '#6A9E7F', primaryLight: '#E8F5EE',
      accent: '#E8806A', accentLight: '#FDECEA',
      text: '#2C2C2C', textSecondary: '#8A8A8A',
      border: '#EDEBE8', white: '#FFFFFF',
    },
  },
  ocean: {
    name: 'Ocean', dark: false,
    colors: {
      background: '#F0F6FA', card: '#FFFFFF',
      primary: '#3A8FBF', primaryLight: '#DFF0FA',
      accent: '#F0A050', accentLight: '#FEF3E2',
      text: '#1A2A35', textSecondary: '#7A94A5',
      border: '#DDE8F0', white: '#FFFFFF',
    },
  },
  sand: {
    name: 'Sand', dark: false,
    colors: {
      background: '#FAF6EF', card: '#FFFFFF',
      primary: '#C0874A', primaryLight: '#FAF0E2',
      accent: '#7A9E7E', accentLight: '#E8F5EA',
      text: '#2E2416', textSecondary: '#9A8470',
      border: '#EDE5D8', white: '#FFFFFF',
    },
  },
  rose: {
    name: 'Rose', dark: false,
    colors: {
      background: '#FDF5F7', card: '#FFFFFF',
      primary: '#C06080', primaryLight: '#FAEAEF',
      accent: '#80A0C0', accentLight: '#EAF0FA',
      text: '#2A1A20', textSecondary: '#A07080',
      border: '#EFE0E5', white: '#FFFFFF',
    },
  },
  // ── Dark ──
  midnight: {
    name: 'Midnight', dark: true,
    colors: {
      background: '#141414', card: '#1E1E28',
      primary: '#7B8FFF', primaryLight: '#25254A',
      accent: '#FF7A85', accentLight: '#38202A',
      text: '#E8EAF2', textSecondary: '#6B7291',
      border: '#2A2A3C', white: '#FFFFFF',
    },
  },
  charcoal: {
    name: 'Charcoal', dark: true,
    colors: {
      background: '#141414', card: '#222222',
      primary: '#64B5F6', primaryLight: '#1A2838',
      accent: '#FF8A65', accentLight: '#2A1A10',
      text: '#EFEFEF', textSecondary: '#7A7A7A',
      border: '#2E2E2E', white: '#FFFFFF',
    },
  },
  forest: {
    name: 'Forest', dark: true,
    colors: {
      background: '#141414', card: '#1E1E1E',
      primary: '#81C784', primaryLight: '#1A2E1C',
      accent: '#FFB74D', accentLight: '#2A200A',
      text: '#E8F0E8', textSecondary: '#6A8A6A',
      border: '#282828', white: '#FFFFFF',
    },
  },
  plum: {
    name: 'Plum', dark: true,
    colors: {
      background: '#141414', card: '#1E1A24',
      primary: '#CE93D8', primaryLight: '#281A38',
      accent: '#80CBC4', accentLight: '#102020',
      text: '#EDE0F5', textSecondary: '#8A6EA0',
      border: '#2C2432', white: '#FFFFFF',
    },
  },
};

export const LIGHT_THEME_KEYS: Exclude<ThemeKey, 'custom'>[] = ['sage', 'ocean', 'sand', 'rose'];
export const DARK_THEME_KEYS: Exclude<ThemeKey, 'custom'>[] = ['midnight', 'charcoal', 'forest', 'plum'];

// Preset swatches for custom theme builder
export const PRIMARY_SWATCHES = [
  '#6A9E7F', '#4CAF88', '#00897B', '#26C6DA',
  '#3A8FBF', '#2979FF', '#5C6BC0', '#7B8FFF',
  '#C0874A', '#FF9800', '#E57373', '#EF5350',
  '#C06080', '#AB47BC', '#8D6E63', '#607D8B',
];

export const ACCENT_SWATCHES = [
  '#FF7A5A', '#FF9800', '#FFC107', '#66BB6A',
  '#26C6DA', '#7B8FFF', '#EC407A', '#FF5722',
];

// Curated backgrounds for custom theme (8 light, 8 dark)
export const BACKGROUND_SWATCHES = [
  // Light
  '#FFFFFF',  // White
  '#FFFBEB',  // Warm yellow
  '#EFF6FF',  // Sky blue
  '#F0FDF4',  // Mint green
  '#FDF2F8',  // Soft pink
  '#F5F3FF',  // Lavender
  '#FFF7ED',  // Peach
  '#F0FDFA',  // Aqua
  // Dark
  '#141414',  // Charcoal
  '#0F172A',  // Dark navy
  '#1A1422',  // Dark plum
  '#10181A',  // Dark teal
  '#1A1200',  // Dark amber
  '#0F1A0F',  // Dark forest
  '#1A0F0F',  // Dark crimson
  '#0F0F1A',  // Dark indigo
];

export function buildCustomPalette(primary: string, accent: string, background: string): ColorPalette {
  const toRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };
  const lighten = (hex: string, amt: number) => {
    const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amt);
    const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amt);
    const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amt);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  };
  const r = parseInt(background.slice(1, 3), 16);
  const g = parseInt(background.slice(3, 5), 16);
  const b = parseInt(background.slice(5, 7), 16);
  const dark = (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
  return {
    background,
    card:          dark ? lighten(background, 14) : '#FFFFFF',
    primary,
    primaryLight:  toRgba(primary, dark ? 0.22 : 0.13),
    accent,
    accentLight:   toRgba(accent, dark ? 0.22 : 0.13),
    text:          dark ? '#E6E8F0' : '#1C1C1E',
    textSecondary: dark ? '#686E8A' : '#888888',
    border:        dark ? lighten(background, 20) : '#E8E8E8',
    white: '#FFFFFF',
  };
}

// Default export for non-themed usage fallback
export const COLORS = THEMES.sage.colors;

// ── Goal Categories (icon names for MaterialCommunityIcons) ───
export const GOAL_CATEGORIES = [
  { key: 'workout',  label: 'Workout',  icon: 'dumbbell' },
  { key: 'study',    label: 'Study',    icon: 'book-open-variant' },
  { key: 'career',   label: 'Career',   icon: 'briefcase-variant-outline' },
  { key: 'health',   label: 'Health',   icon: 'heart-pulse' },
  { key: 'creative', label: 'Creative', icon: 'palette-outline' },
  { key: 'finance',  label: 'Finance',  icon: 'cash-multiple' },
  { key: 'social',   label: 'Social',   icon: 'account-group-outline' },
  { key: 'other',    label: 'Other',    icon: 'dots-horizontal-circle-outline' },
] as const;

export type GoalCategoryKey = (typeof GOAL_CATEGORIES)[number]['key'];

export const MOODS = [
  { key: 'great',      label: 'Great',      emoji: '🔥' },
  { key: 'good',       label: 'Good',       emoji: '😊' },
  { key: 'struggling', label: 'Struggling', emoji: '😤' },
  { key: 'blocked',    label: 'Blocked',    emoji: '😔' },
] as const;

export const ACTIVITY_LEVELS: Record<string, { label: string; color: string }> = {
  very_active: { label: 'Elite',    color: '#6A9E7F' },
  active:      { label: 'Active',   color: '#F0B429' },
  occasional:  { label: 'Casual',   color: '#8A8A8A' },
  inactive:    { label: 'Inactive', color: '#E8806A' },
  new:         { label: 'New',      color: '#8A8A8A' },
};
