import { useMutation } from '@tanstack/react-query';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { patchProfile } from './api';
import { useAuthStore } from '../../store/authStore';

export function useSaveProfile() {
  const updateUser = useAuthStore((s) => s.updateUser);
  return useMutation({
    mutationFn: ({ displayName, bio }: { displayName: string; bio: string }) =>
      patchProfile(displayName, bio),
    onSuccess: (data) => {
      updateUser({ display_name: data.display_name, bio: data.bio });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved!');
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });
}
