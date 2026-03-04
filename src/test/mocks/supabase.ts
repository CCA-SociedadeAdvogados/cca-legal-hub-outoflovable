import { vi } from 'vitest';

/**
 * Creates a chainable mock for Supabase query builder methods.
 * Each method returns the same object so calls like
 * supabase.from('x').select('*').eq('id', '1').maybeSingle()
 * all resolve through the chain.
 */
export function createSupabaseMock() {
  const queryBuilder: Record<string, any> = {};

  // All chainable methods return the query builder itself
  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike',
    'in', 'is', 'not', 'or', 'filter',
    'order', 'limit', 'range', 'textSearch',
  ];

  for (const method of chainMethods) {
    queryBuilder[method] = vi.fn().mockReturnValue(queryBuilder);
  }

  // Terminal methods return { data, error }
  queryBuilder.single = vi.fn().mockResolvedValue({ data: null, error: null });
  queryBuilder.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  queryBuilder.then = undefined; // Prevent auto-resolution as promise

  const from = vi.fn().mockReturnValue(queryBuilder);
  const rpc = vi.fn().mockResolvedValue({ data: null, error: null });

  const storage = {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/avatar.png' } }),
    }),
  };

  const auth = {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
    signUp: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  };

  const supabase = { from, rpc, storage, auth };

  return { supabase, from, queryBuilder, rpc, storage };
}
