import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders, MOCK_USER } from './utils';
import { createBuilder, mockFrom, mockSupabase } from './mocks/supabase';
import type { User } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Mutable auth mock — allows testing null-user scenarios
// ---------------------------------------------------------------------------
let mockAuthUser: User | null = MOCK_USER;

vi.mock('@/integrations/supabase/client', () => ({ supabase: mockSupabase }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mockAuthUser }) }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

import { useProfile } from '@/hooks/useProfile';

const MOCK_PROFILE = {
  id: MOCK_USER.id,
  email: MOCK_USER.email,
  nome_completo: 'Utilizador Teste',
  onboarding_completed: true,
  current_organization_id: 'org-abc',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// useProfile — fetch
// ---------------------------------------------------------------------------
describe('useProfile — query', () => {
  beforeEach(() => {
    mockAuthUser = MOCK_USER;
    vi.clearAllMocks();
  });

  it('fetches and returns the user profile', async () => {
    mockFrom.mockImplementation(() =>
      createBuilder({ data: MOCK_PROFILE, error: null }),
    );

    const { result } = renderHookWithProviders(() => useProfile());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.profile?.nome_completo).toBe('Utilizador Teste');
    expect(result.current.profile?.id).toBe(MOCK_USER.id);
  });

  it('does not fetch when user is null (query is disabled)', async () => {
    mockAuthUser = null;
    mockFrom.mockImplementation(() => createBuilder({ data: MOCK_PROFILE, error: null }));

    const { result } = renderHookWithProviders(() => useProfile());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.profile).toBeUndefined();
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useProfile — self-healing (creates profile when missing)
// ---------------------------------------------------------------------------
describe('useProfile — self-healing pattern', () => {
  beforeEach(() => {
    mockAuthUser = MOCK_USER;
    vi.clearAllMocks();
  });

  it('creates a new profile when none exists (maybeSingle returns null)', async () => {
    const newProfile = { ...MOCK_PROFILE, onboarding_completed: false };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // SELECT query → profile not found
        return createBuilder({ data: null, error: null });
      }
      // INSERT query → new profile
      return createBuilder({ data: newProfile, error: null });
    });

    const { result } = renderHookWithProviders(() => useProfile());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.profile?.onboarding_completed).toBe(false);
  });

  it('propagates errors from the SELECT query', async () => {
    mockFrom.mockImplementation(() =>
      createBuilder({ data: null, error: new Error('Connection refused') }),
    );

    const { result } = renderHookWithProviders(() => useProfile());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// useProfile — updateProfile mutation
// ---------------------------------------------------------------------------
describe('useProfile — updateProfile', () => {
  beforeEach(() => {
    mockAuthUser = MOCK_USER;
    vi.clearAllMocks();
  });

  it('calls Supabase update and returns updated profile', async () => {
    const updated = { ...MOCK_PROFILE, nome_completo: 'Ana Silva' };

    mockFrom.mockImplementation(() => createBuilder({ data: updated, error: null }));

    const { result } = renderHookWithProviders(() => useProfile());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const response = await result.current.updateProfile.mutateAsync({
      nome_completo: 'Ana Silva',
    });

    expect(response?.nome_completo).toBe('Ana Silva');
    expect(mockFrom).toHaveBeenCalledWith('profiles');
  });

  it('throws when user is not authenticated', async () => {
    mockAuthUser = null;
    mockFrom.mockImplementation(() => createBuilder({ data: null, error: null }));

    const { result } = renderHookWithProviders(() => useProfile());

    await expect(
      result.current.updateProfile.mutateAsync({ nome_completo: 'X' }),
    ).rejects.toThrow('Utilizador não autenticado');
  });
});
