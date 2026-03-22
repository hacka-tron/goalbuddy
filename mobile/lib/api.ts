import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_URL = 'http://10.0.2.2:3000'; // Android emulator → localhost

export const getToken = () => AsyncStorage.getItem('token');
export const setToken = (token: string) => AsyncStorage.setItem('token', token);
export const clearToken = () => AsyncStorage.removeItem('token');

export const apiFetch = async (path: string, options: RequestInit = {}) => {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
};
