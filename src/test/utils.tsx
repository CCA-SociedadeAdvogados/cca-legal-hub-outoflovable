import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, type RenderHookOptions } from '@testing-library/react';

// Mock user that simulates a Supabase auth user
export const mockUser = {
  id: 'test-user-id-123',
  email: 'test@cca.pt',
  user_metadata: {
    nome_completo: 'Test User',
  },
  app_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
} as any;

/**
 * Creates a fresh QueryClient configured for testing.
 * Retries disabled, short gc time, errors not thrown to console.
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Renders a hook wrapped in QueryClientProvider (and optionally other providers).
 * Returns the renderHook result + the queryClient for cache inspection.
 */
export function renderHookWithProviders<TResult>(
  hook: () => TResult,
  options?: { queryClient?: QueryClient },
) {
  const queryClient = options?.queryClient ?? createTestQueryClient();

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  const result = renderHook(hook, { wrapper });
  return { ...result, queryClient };
}
