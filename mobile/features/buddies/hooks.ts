import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { fetchBuddies, respondToRequest } from './api';
import { Connection } from './types';

export function useBuddies() {
  return useQuery<Connection[]>({
    queryKey: ['buddies'],
    queryFn: fetchBuddies,
    staleTime: 0,
    refetchInterval: 5000,
  });
}

export function useRespondToRequest() {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'accepted' | 'declined' }) =>
      respondToRequest(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['buddies'] }),
    onError: (_err: Error, variables: { id: string; status: 'accepted' | 'declined' }) => {
      const action = variables.status === 'accepted' ? 'accept' : 'decline';
      Alert.alert(
        `Couldn't ${action} request`,
        'Check your connection and try again.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => mutation.mutate(variables) },
        ]
      );
    },
  });
  return mutation;
}
