import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders, MOCK_USER } from './utils';
import { createBuilder, mockFrom, mockSupabase } from './mocks/supabase';
import type { User } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Mutable auth mock — tests can set mockAuthUser to null to simulate
// an unauthenticated state.
// ---------------------------------------------------------------------------
let mockAuthUser: User | null = MOCK_USER;

vi.mock('@/integrations/supabase/client', () => ({ supabase: mockSupabase }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mockAuthUser }) }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

import { useContratos, useContrato } from '@/hooks/useContratos';

const ORG_ID = 'org-abc';
const MOCK_CONTRATO = {
  id: 'ct-1',
  titulo_contrato: 'Contrato de Teste',
  tipo_contrato: 'prestacao_servicos',
  estado_contrato: 'activo',
  arquivado: false,
  organization_id: ORG_ID,
  created_by_id: MOCK_USER.id,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

function makeProfileBuilder() {
  return createBuilder({ data: { current_organization_id: ORG_ID }, error: null });
}
function makeContratosListBuilder(data: unknown[] = [MOCK_CONTRATO]) {
  return createBuilder({ data, error: null });
}
function makeContratoBuilder(data: unknown = MOCK_CONTRATO) {
  return createBuilder({ data, error: null });
}

// ---------------------------------------------------------------------------
// useContratos — query
// ---------------------------------------------------------------------------
describe('useContratos — query', () => {
  beforeEach(() => {
    mockAuthUser = MOCK_USER;
    vi.clearAllMocks();
  });

  it('returns the list of contratos from Supabase', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'contratos') return makeContratosListBuilder();
      return createBuilder({ data: null, error: null });
    });

    const { result } = renderHookWithProviders(() => useContratos());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.contratos).toHaveLength(1);
    expect(result.current.contratos?.[0].titulo_contrato).toBe('Contrato de Teste');
  });

  it('returns empty array when no contratos exist', async () => {
    mockFrom.mockImplementation(() => makeContratosListBuilder([]));

    const { result } = renderHookWithProviders(() => useContratos());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.contratos).toEqual([]);
  });

  it('sets error state when Supabase returns an error', async () => {
    mockFrom.mockImplementation(() => createBuilder({ data: null, error: new Error('DB error') }));

    const { result } = renderHookWithProviders(() => useContratos());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  it('does not fetch when user is null (query is disabled)', async () => {
    mockAuthUser = null;
    mockFrom.mockImplementation(() => makeContratosListBuilder());

    const { result } = renderHookWithProviders(() => useContratos());

    // query disabled — stays pending but not loading (React Query v5: isLoading = isPending && isFetching)
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.contratos).toBeUndefined();
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useContratos — createContrato mutation
// ---------------------------------------------------------------------------
describe('useContratos — createContrato', () => {
  beforeEach(() => {
    mockAuthUser = MOCK_USER;
    vi.clearAllMocks();
  });

  it('inserts a new contrato with organization_id and user ids', async () => {
    const newContrato = { ...MOCK_CONTRATO, id: 'ct-new' };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return makeProfileBuilder();
      if (table === 'contratos') return makeContratoBuilder(newContrato);
      return createBuilder({ data: null, error: null });
    });

    const { result } = renderHookWithProviders(() => useContratos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const created = await result.current.createContrato.mutateAsync({
      titulo_contrato: 'Novo Contrato',
      tipo_contrato: 'nda',
      departamento_responsavel: 'juridico',
      parte_a_nome_legal: 'Empresa A',
      parte_b_nome_legal: 'Empresa B',
    } as never);

    expect(created).toEqual(newContrato);
  });

  it('throws when no organization is found', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles')
        return createBuilder({ data: { current_organization_id: null }, error: null });
      return createBuilder({ data: null, error: null });
    });

    const { result } = renderHookWithProviders(() => useContratos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      result.current.createContrato.mutateAsync({ titulo_contrato: 'Test' } as never),
    ).rejects.toThrow('Nenhuma organização selecionada');
  });
});

// ---------------------------------------------------------------------------
// useContratos — archiveContrato mutation
// ---------------------------------------------------------------------------
describe('useContratos — archiveContrato', () => {
  beforeEach(() => {
    mockAuthUser = MOCK_USER;
    vi.clearAllMocks();
  });

  it('archives a contrato by id', async () => {
    mockFrom.mockImplementation(() => createBuilder({ data: null, error: null }));

    const { result } = renderHookWithProviders(() => useContratos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.archiveContrato.mutateAsync('ct-1');

    expect(mockFrom).toHaveBeenCalledWith('contratos');
  });
});

// ---------------------------------------------------------------------------
// useContrato — single contract query
// useContrato returns the raw useQuery result: { data, isLoading, error }
// ---------------------------------------------------------------------------
describe('useContrato', () => {
  beforeEach(() => {
    mockAuthUser = MOCK_USER;
    vi.clearAllMocks();
  });

  it('fetches a single contrato by id', async () => {
    mockFrom.mockImplementation(() => makeContratoBuilder());

    const { result } = renderHookWithProviders(() => useContrato('ct-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.id).toBe('ct-1');
  });

  it('returns undefined data when id is not provided (query is disabled)', () => {
    mockFrom.mockImplementation(() => makeContratoBuilder());

    const { result } = renderHookWithProviders(() => useContrato(undefined));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });
});
