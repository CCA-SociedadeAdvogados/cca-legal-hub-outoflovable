import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders, mockUser } from '@/test/utils';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const sampleOrg = {
  id: 'org-1',
  name: 'CCA Teste',
  slug: 'cca-teste',
  logo_url: null,
  lawyer_name: null,
  lawyer_photo_url: null,
  industry_sectors: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const sampleMembership = {
  organization_id: 'org-1',
  role: 'editor' as const,
  organizations: { id: 'org-1', name: 'CCA Teste', slug: 'cca-teste', logo_url: null },
};

// ── Per-table mock builders ──────────────────────────────────────────────────

let profileOrgId: string | null = 'org-1';

function makeBuilder(resolveWith: () => Promise<any>) {
  const b: Record<string, any> = {};
  const chain = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'order', 'limit', 'range'];
  for (const m of chain) {
    b[m] = vi.fn().mockReturnValue(b);
  }
  b.maybeSingle = vi.fn().mockImplementation(resolveWith);
  b.single = vi.fn().mockImplementation(resolveWith);
  // Make builder itself thenable (for chains without terminal)
  b.then = (resolve: any, reject: any) => resolveWith().then(resolve, reject);
  return b;
}

const orgBuilder = makeBuilder(() =>
  Promise.resolve({ data: [sampleOrg], error: null }),
);

const profileBuilder = makeBuilder(() =>
  Promise.resolve({
    data: profileOrgId ? { current_organization_id: profileOrgId } : null,
    error: null,
  }),
);

// For maybeSingle on organizations (currentOrg query does from('organizations').eq(id).maybeSingle())
orgBuilder.maybeSingle = vi.fn().mockImplementation(() =>
  Promise.resolve({ data: profileOrgId ? sampleOrg : null, error: null }),
);

const membersBuilder = makeBuilder(() =>
  Promise.resolve({ data: [sampleMembership], error: null }),
);

const rpc = vi.fn().mockResolvedValue({ data: null, error: null });

const supabase = {
  from: vi.fn().mockImplementation((table: string) => {
    if (table === 'organizations') return orgBuilder;
    if (table === 'profiles') return profileBuilder;
    if (table === 'organization_members') return membersBuilder;
    return makeBuilder(() => Promise.resolve({ data: null, error: null }));
  }),
  rpc,
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: '' } }),
    }),
  },
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  },
};

vi.mock('@/integrations/supabase/client', () => ({ supabase }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

const { useOrganizations } = await import('@/hooks/useOrganizations');

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useOrganizations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profileOrgId = 'org-1';
  });

  describe('queries', () => {
    it('fetches organizations list', async () => {
      const { result } = renderHookWithProviders(() => useOrganizations());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabase.from).toHaveBeenCalledWith('organizations');
      expect(result.current.organizations).toEqual([sampleOrg]);
    });

    it('fetches current organization from profile', async () => {
      const { result } = renderHookWithProviders(() => useOrganizations());

      await waitFor(() => {
        expect(result.current.currentOrganization).toBeTruthy();
      });

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(result.current.currentOrganization).toEqual(sampleOrg);
    });

    it('returns null current org when profile has no org id', async () => {
      profileOrgId = null;

      const { result } = renderHookWithProviders(() => useOrganizations());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentOrganization).toBeNull();
    });

    it('fetches user memberships', async () => {
      const { result } = renderHookWithProviders(() => useOrganizations());

      await waitFor(() => {
        expect(result.current.membershipsLoading).toBe(false);
      });

      expect(supabase.from).toHaveBeenCalledWith('organization_members');
      expect(result.current.userMemberships).toEqual([sampleMembership]);
    });
  });

  describe('switchOrganization mutation', () => {
    it('updates profile and invalidates org-scoped caches', async () => {
      const { result, queryClient } = renderHookWithProviders(() => useOrganizations());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      await result.current.switchOrganization.mutateAsync('org-2');

      expect(profileBuilder.update).toHaveBeenCalledWith({ current_organization_id: 'org-2' });

      const invalidatedKeys = invalidateSpy.mock.calls.map(c => c[0]?.queryKey);
      expect(invalidatedKeys).toContainEqual(['current-organization']);
      expect(invalidatedKeys).toContainEqual(['contratos']);
      expect(invalidatedKeys).toContainEqual(['eventos-legislativos']);
      expect(invalidatedKeys).toContainEqual(['impactos']);
    });
  });

  describe('createOrganization mutation', () => {
    it('calls RPC create_organization', async () => {
      rpc.mockResolvedValueOnce({ data: 'new-org-id', error: null });

      const { result } = renderHookWithProviders(() => useOrganizations());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.createOrganization.mutateAsync({
        name: 'Nova Org',
        slug: 'nova-org',
      });

      expect(rpc).toHaveBeenCalledWith('create_organization', {
        p_name: 'Nova Org',
        p_slug: 'nova-org',
      });
    });
  });
});
