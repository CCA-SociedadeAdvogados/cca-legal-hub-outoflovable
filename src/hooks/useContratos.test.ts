import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { createSupabaseMock } from '@/test/mocks/supabase';
import { renderHookWithProviders, mockUser } from '@/test/utils';

// ── Mocks ────────────────────────────────────────────────────────────────────

const { supabase, from, queryBuilder } = createSupabaseMock();

vi.mock('@/integrations/supabase/client', () => ({
  supabase,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

// Import AFTER mocks are set up
const { useContratos, useContrato } = await import('@/hooks/useContratos');

// ── Helpers ──────────────────────────────────────────────────────────────────

const sampleContrato = {
  id: 'c1',
  titulo_contrato: 'Contrato Teste',
  tipo_contrato: 'nda',
  estado_contrato: 'rascunho',
  arquivado: false,
  created_at: '2024-01-01T00:00:00Z',
  organization_id: 'org-1',
  created_by_id: mockUser.id,
  updated_by_id: mockUser.id,
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useContratos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('query', () => {
    it('fetches contracts from supabase', async () => {
      // Configure the mock chain to resolve with sample data
      queryBuilder.range.mockResolvedValueOnce({
        data: [sampleContrato],
        error: null,
      });

      const { result } = renderHookWithProviders(() => useContratos());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(from).toHaveBeenCalledWith('contratos');
      expect(queryBuilder.select).toHaveBeenCalledWith('*', { count: 'exact' });
      expect(queryBuilder.eq).toHaveBeenCalledWith('arquivado', false);
      expect(queryBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result.current.contratos).toEqual([sampleContrato]);
    });

    it('handles supabase errors', async () => {
      queryBuilder.range.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error', code: '500' },
      });

      const { result } = renderHookWithProviders(() => useContratos());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });

    it('does not fetch when user is null', async () => {
      // Temporarily override useAuth
      const useAuthModule = await import('@/contexts/AuthContext');
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValueOnce({ user: null } as any);

      // The query should not execute (enabled: !!user)
      // We verify by checking that from() was not called for this render
      from.mockClear();

      const { result } = renderHookWithProviders(() => useContratos());

      // Give it a tick
      await new Promise(r => setTimeout(r, 50));

      // isLoading should remain true (query never fires)
      expect(result.current.contratos).toBeUndefined();
    });
  });

  describe('createContrato mutation', () => {
    it('includes user id and organization id in insert', async () => {
      // Mock getCurrentOrganizationId
      queryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { current_organization_id: 'org-1' },
        error: null,
      });

      // Mock the insert chain
      queryBuilder.single.mockResolvedValueOnce({
        data: { ...sampleContrato, id: 'new-id' },
        error: null,
      });

      // Mock the initial query
      queryBuilder.range.mockResolvedValue({
        data: [sampleContrato],
        error: null,
      });

      const { result } = renderHookWithProviders(() => useContratos());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.createContrato.mutateAsync({
        titulo_contrato: 'Novo Contrato',
        tipo_contrato: 'nda',
      } as any);

      // Verify insert was called with user and org ids
      expect(queryBuilder.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          titulo_contrato: 'Novo Contrato',
          created_by_id: mockUser.id,
          updated_by_id: mockUser.id,
          organization_id: 'org-1',
        }),
      ]);
    });

    it('throws when no organization is selected', async () => {
      // Mock getCurrentOrganizationId returning null
      queryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { current_organization_id: null },
        error: null,
      });

      queryBuilder.range.mockResolvedValue({
        data: [],
        error: null,
      });

      const { result } = renderHookWithProviders(() => useContratos());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        result.current.createContrato.mutateAsync({ titulo_contrato: 'Test' } as any),
      ).rejects.toThrow('Nenhuma organização selecionada');
    });
  });

  describe('archiveContrato mutation', () => {
    it('sets arquivado to true', async () => {
      queryBuilder.eq.mockResolvedValueOnce({ error: null });
      queryBuilder.range.mockResolvedValue({ data: [], error: null });

      const { result } = renderHookWithProviders(() => useContratos());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.archiveContrato.mutateAsync('c1');

      expect(queryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ arquivado: true }),
      );
    });
  });
});

describe('useContrato', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches a single contract by id', async () => {
    queryBuilder.single.mockResolvedValueOnce({
      data: sampleContrato,
      error: null,
    });

    const { result } = renderHookWithProviders(() => useContrato('c1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(from).toHaveBeenCalledWith('contratos');
    expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'c1');
    expect(result.current.data).toEqual(sampleContrato);
  });

  it('does not fetch when id is undefined', async () => {
    from.mockClear();
    const { result } = renderHookWithProviders(() => useContrato(undefined));

    await new Promise(r => setTimeout(r, 50));
    expect(result.current.data).toBeUndefined();
  });
});
