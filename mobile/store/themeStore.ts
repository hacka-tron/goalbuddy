// Theme state is now part of the unified store.
// This file re-exports useStore as useThemeStore for backward compatibility —
// all existing imports of useThemeStore continue to work without changes.
export { useStore as useThemeStore } from './index';
export type { ThemeSlice as ThemeState } from './slices/themeSlice';
