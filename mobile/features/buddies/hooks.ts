import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { fetchBuddies, respondToRequest } from './api';
import { Connection } from './types';

// ─── Query Key Factories ────────────────────────────────────

export const buddyKeys = {
  all: ['buddies'] as const,
  lists: () => [...buddyKeys.all, 'list'] as const,
  details: () => [...buddyKeys.all, 'detail'] as const,
  detail: (id: string) => [...buddyKeys.details(), id] as const,
};

// ─── Hooks ──────────────────────────────────────────────────

export function useBuddies() {
  return useQuery<Connection[]>({
    queryKey: buddyKeys.all,
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
    onSuccess: () => qc.invalidateQueries({ queryKey: buddyKeys.all }),
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
