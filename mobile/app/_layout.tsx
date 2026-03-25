import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { apiFetch } from '../lib/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,  // data stays fresh for 2 min — no refetch on screen revisit
      gcTime: 10 * 60 * 1000,    // keep unused data in cache for 10 min
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const { setAuth, logout, restoreFromCache } = useAuthStore();
  const { loadTheme, colors } = useThemeStore();

  useEffect(() => {
    loadTheme();
    (async () => {
      // Restore from cache immediately — no network wait on startup
      const cached = await restoreFromCache();
      if (!cached) return; // no token → isLoading set to false, redirect to login

      // Validate token in background; silently refresh user data
      try {
        const user = await apiFetch('/users/me');
        await setAuth(cached.token, user);
      } catch {
        logout();
      }
    })();
  }, []);

  const bg = colors.background;
  const r = parseInt(bg.slice(1, 3), 16);
  const g = parseInt(bg.slice(3, 5), 16);
  const b = parseInt(bg.slice(5, 7), 16);
  const isDark = (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} translucent={false} />
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
