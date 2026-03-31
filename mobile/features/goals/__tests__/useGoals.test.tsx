import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { apiFetch } from '../../../lib/api';
import { Goal } from '../types';
import { useGoals } from '../hooks';

const mockedApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: Infinity,
        retry: false,
      },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { queryClient, wrapper };
}

describe('useGoals', () => {
  afterEach(() => {
    mockedApiFetch.mockReset();
  });

  it('returns a loading state while the goals request is in flight', () => {
    mockedApiFetch.mockReturnValue(new Promise(() => undefined));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useGoals(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(mockedApiFetch).toHaveBeenCalledWith('/goals');
  });

  it('returns goals when the request succeeds', async () => {
    const goals: Goal[] = [
      {
        id: 'goal-1',
        title: 'Run a 5k',
        category: 'Fitness',
        description: 'Build up weekly endurance.',
        target_date: null,
        status: 'active',
        is_public: true,
        coop_open: false,
        connection_id: null,
        connection_status: null,
        buddy_name: null,
        buddy_activity_level: null,
        has_pending_request: false,
      },
    ];

    mockedApiFetch.mockResolvedValue(goals);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useGoals(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(goals);
    expect(mockedApiFetch).toHaveBeenCalledWith('/goals');
  });

  it('returns an error state when the request fails', async () => {
    mockedApiFetch.mockRejectedValue(new Error('Failed to fetch goals'));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useGoals(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Failed to fetch goals');
  });
});
