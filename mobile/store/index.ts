import { create } from 'zustand';
import { createAuthSlice, AuthSlice } from './slices/authSlice';

// Combine slices into a single store type
type StoreState = AuthSlice; // Add other slices here as they are created

export const useStore = create<StoreState>()((...a) => ({
  ...createAuthSlice(...a),
}));

// Export a convenience hook for selectors
export const useAuth = () => useStore((state) => state);
export const useAuthActions = () => useStore((state) => state.actions);
