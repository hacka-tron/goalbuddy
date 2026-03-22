import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { getToken, apiFetch } from '../lib/api';

const queryClient = new QueryClient();

export default function RootLayout() {
  const { setAuth, logout } = useAuthStore();

  useEffect(() => {
    // Rehydrate session on app start
    (async () => {
      try {
        const token = await getToken();
        if (!token) { logout(); return; }
        const user = await apiFetch('/users/me');
        await setAuth(token, user);
      } catch {
        logout();
      }
    })();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" backgroundColor="#F9F7F4" />
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
