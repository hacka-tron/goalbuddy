// Notification state is now part of the unified store.
// This file re-exports useStore as useNotificationStore for backward compatibility —
// all existing imports of useNotificationStore continue to work without changes.
export { useStore as useNotificationStore } from './index';
export type { BuddyTabKey } from './slices/notificationSlice';
