import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders, MOCK_USER } from './utils';
import { createBuilder, mockFrom, mockRpc, mockSupabase } from './mocks/supabase';
import type { User } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Mutable auth mock
// ---------------------------------------------------------------------------
let mockAuthUser: User | null = MOCK_USER;

vi.mock('@/integrations/supabase/client', () => ({ supabase: mockSupabase }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mockAuthUser }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useOrganizations } from '@/hooks/useOrganizations';

const MOCK_ORG = {
  id: 'org-abc',
  name: 'CCA Demo',
  slug: 'cca-demo',
  logo_url: null,
  lawyer_name: null,
  lawyer_photo_url: null,
  industry_sectors: [],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const MOCK_MEMBERSHIP = {
  organization_id: MOCK_ORG.id,
  role: 'editor',
  organizations: { id: MOCK_ORG.id, name: MOCK_ORG.name, slug: MOCK_ORG.slug, logo_url: null },
};

// ---------------------------------------------------------------------------
// useOrganizations — queries
// ---------------------------------------------------------------------------
describe('useOrganizations — queries', () => {
  beforeEach(() => {
    mockAuthUser = MOCK_USER;
    vi.clearAllMocks();
  });

  it('fetches organizations and current organization', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'organizations')
        return createBuilder({ data: [MOCK_ORG], error: null });
      if (table === 'profiles')
        return createBuilder({ data: { current_organization_id: MOCK_ORG.id }, error: null });
      if (table === 'organization_members')
        return createBuilder({ data: [MOCK_MEMBERSHIP], error: null });
      return createBuilder({ data: null, error: null });
    });

    const { result } = renderHookWithProviders(() => useOrganizations());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.organizations).toHaveLength(1);
    expect(result.current.organizations?.[0].name).toBe('CCA Demo');
  });

  it('returns empty arrays when user has no organizations', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'organization_members')
        return createBuilder({ data: [], error: null });
      return createBuilder({ data: [], error: null });
    });

    const { result } = renderHookWithProviders(() => useOrganizations());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.organizations).toEqual([]);
  });

  it('does not fetch when user is null (queries are disabled)', async () => {
    mockAuthUser = null;
    mockFrom.mockImplementation(() => createBuilder({ data: [], error: null }));

    const { result } = renderHookWithProviders(() => useOrganizations());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useOrganizations — createOrganization mutation (via RPC)
// ---------------------------------------------------------------------------
describe('useOrganizations — createOrganization', () => {
  beforeEach(() => {
    mockAuthUser = MOCK_USER;
    vi.clearAllMocks();
  });

  it('calls the create_organization RPC function', async () => {
    mockFrom.mockImplementation(() => createBuilder({ data: [], error: null }));
    mockRpc.mockResolvedValue({ data: MOCK_ORG, error: null });

    const { result } = renderHookWithProviders(() => useOrganizations());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const org = await result.current.createOrganization.mutateAsync({
      name: 'CCA Demo',
      slug: 'cca-demo',
    });

    expect(mockRpc).toHaveBeenCalledWith('create_organization', {
      p_name: 'CCA Demo',
      p_slug: 'cca-demo',
    });
    expect(org).toEqual(MOCK_ORG);
  });

  it('throws when user is not authenticated', async () => {
    mockAuthUser = null;
    mockFrom.mockImplementation(() => createBuilder({ data: [], error: null }));

    const { result } = renderHookWithProviders(() => useOrganizations());

    await expect(
      result.current.createOrganization.mutateAsync({ name: 'X', slug: 'x' }),
    ).rejects.toThrow('Utilizador não autenticado');
  });
});

// ---------------------------------------------------------------------------
// useOrganizations — switchOrganization mutation
// ---------------------------------------------------------------------------
describe('useOrganizations — switchOrganization', () => {
  beforeEach(() => {
    mockAuthUser = MOCK_USER;
    vi.clearAllMocks();
  });

  it('updates the current_organization_id in profiles', async () => {
    mockFrom.mockImplementation(() => createBuilder({ data: null, error: null }));

    const { result } = renderHookWithProviders(() => useOrganizations());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.switchOrganization.mutateAsync('org-xyz');

    expect(mockFrom).toHaveBeenCalledWith('profiles');
  });
});
