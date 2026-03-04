/**
 * Reusable Supabase chainable query builder mock.
 *
 * Usage in test files:
 *   vi.mock('@/integrations/supabase/client', () => ({ supabase: mockSupabase }));
 *
 *   // Configure what a table query returns (affects next awaited call):
 *   mockFrom.mockImplementation((table) =>
 *     createBuilder(table === 'contratos' ? { data: [], error: null } : { data: null, error: null })
 *   );
 */
import { vi } from 'vitest';

/** Create a chainable query builder that resolves with `result`. */
export function createBuilder(result: { data: unknown; error: unknown } | null) {
  const resolved = result ?? { data: null, error: null };

  const builder: Record<string, unknown> = {};

  // Chainable no-op methods — each returns `builder` (i.e. `this`)
  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'in', 'not', 'is', 'gt', 'lt', 'gte', 'lte',
    'order', 'range', 'limit', 'filter', 'match',
  ];
  chainMethods.forEach((m) => {
    builder[m] = vi.fn().mockReturnValue(builder);
  });

  // Terminal async methods
  builder['single'] = vi.fn().mockResolvedValue(resolved);
  builder['maybeSingle'] = vi.fn().mockResolvedValue(resolved);

  // Make the builder itself thenable so `await supabase.from('t').select(...)` works
  // without an explicit terminal method call.
  (builder as { then?: Function })['then'] = (
    resolve: (v: unknown) => unknown,
    reject?: (e: unknown) => unknown,
  ) => Promise.resolve(resolved).then(resolve, reject);

  return builder;
}

// ---------------------------------------------------------------------------
// Pre-built mock for the whole supabase client.
// Import `mockFrom` / `mockRpc` in your test and configure via mockImplementation.
// ---------------------------------------------------------------------------
export const mockFrom = vi.fn();
export const mockRpc = vi.fn();
export const mockFunctionsInvoke = vi.fn();

export const mockSupabase = {
  from: mockFrom,
  rpc: mockRpc,
  auth: {
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
    signUp: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    setSession: vi.fn().mockResolvedValue({ data: {}, error: null }),
  },
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/avatar.png' } }),
    }),
  },
  functions: {
    invoke: mockFunctionsInvoke,
  },
  channel: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  }),
  removeChannel: vi.fn(),
};
