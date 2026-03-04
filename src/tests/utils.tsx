/**
 * Test utilities — wraps renderHook with providers required by data hooks.
 */
import React from 'react';
import { renderHook, type RenderHookOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Default mock user
// ---------------------------------------------------------------------------
export const MOCK_USER: User = {
  id: 'user-123',
  email: 'test@cca.pt',
  user_metadata: { nome_completo: 'Utilizador Teste' },
  app_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
} as User;

// ---------------------------------------------------------------------------
// Auth context mock
// ---------------------------------------------------------------------------
interface MockAuthValue {
  user?: User | null;
  session?: null;
  loading?: boolean;
  signIn?: () => Promise<{ error: null }>;
  signOut?: () => Promise<void>;
}

const AuthContext = React.createContext<MockAuthValue>({});

export const useAuth = () => React.useContext(AuthContext);

// ---------------------------------------------------------------------------
// Wrapper factory
// ---------------------------------------------------------------------------
function makeWrapper(authValue: MockAuthValue) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <AuthContext.Provider value={authValue}>
          {children}
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  };
}

// ---------------------------------------------------------------------------
// renderHookWithProviders — main export
// ---------------------------------------------------------------------------
export function renderHookWithProviders<T>(
  hook: () => T,
  options: RenderHookOptions<unknown> & { user?: User | null } = {},
) {
  const { user = MOCK_USER, ...rest } = options;
  const authValue: MockAuthValue = {
    user,
    session: null,
    loading: false,
    signIn: async () => ({ error: null }),
    signOut: async () => {},
  };
  return renderHook(hook, { wrapper: makeWrapper(authValue), ...rest });
}
