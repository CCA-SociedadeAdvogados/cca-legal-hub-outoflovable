/**
 * Tests for pure business-logic functions extracted from Supabase Edge Functions.
 *
 * Edge functions use Deno APIs so we can't import them directly.
 * We replicate the pure functions here — the logic is identical.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// sso-cca/index.ts — constants & pure validators
// ---------------------------------------------------------------------------
const MAX_CODE_LENGTH = 2048;
const MAX_STATE_LENGTH = 128;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALPHANUMERIC_REGEX = /^[a-zA-Z0-9_-]+$/;

function validateCode(code: unknown): { valid: boolean; error?: string } {
  if (typeof code !== 'string') return { valid: false, error: 'code_must_be_string' };
  if (code.length === 0) return { valid: false, error: 'code_required' };
  if (code.length > MAX_CODE_LENGTH) return { valid: false, error: 'code_too_long' };
  if (!/^[\x21-\x7E]+$/.test(code)) return { valid: false, error: 'code_invalid_format' };
  return { valid: true };
}

function validateStateFormat(state: unknown): { valid: boolean; error?: string } {
  if (state === null || state === undefined) return { valid: false, error: 'state_required' };
  if (typeof state !== 'string') return { valid: false, error: 'state_must_be_string' };
  if (state.length === 0) return { valid: false, error: 'state_required' };
  if (state.length > MAX_STATE_LENGTH) return { valid: false, error: 'state_too_long' };
  if (!UUID_REGEX.test(state) && !ALPHANUMERIC_REGEX.test(state)) {
    return { valid: false, error: 'state_invalid_format' };
  }
  return { valid: true };
}

function decodeIdToken(idToken: string): Record<string, unknown> | null {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const binaryString = atob(payload);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    const decoded = new TextDecoder('utf-8').decode(bytes);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// admin-create-user/index.ts — generateSecurePassword (cryptographically secure)
// ---------------------------------------------------------------------------
function secureRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 0 || maxExclusive > 0x100000000) {
    throw new Error('secureRandomInt: invalid range');
  }
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % maxExclusive;
  }
}

function pickRandomChar(charset: string): string {
  return charset[secureRandomInt(charset.length)];
}

function shuffleSecure<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function generateSecurePassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%&*';
  const allChars = uppercase + lowercase + numbers + special;
  const chars: string[] = [
    pickRandomChar(uppercase),
    pickRandomChar(lowercase),
    pickRandomChar(numbers),
    pickRandomChar(special),
  ];
  for (let i = 0; i < 8; i++) chars.push(pickRandomChar(allChars));
  return shuffleSecure(chars).join('');
}

// ---------------------------------------------------------------------------
// validateCode
// ---------------------------------------------------------------------------
describe('validateCode()', () => {
  it('accepts a valid authorization code', () => {
    expect(validateCode('abc123XYZ')).toEqual({ valid: true });
  });

  it('accepts codes with printable ASCII chars (!, *, @)', () => {
    expect(validateCode('code!with*special@chars')).toEqual({ valid: true });
  });

  it('rejects non-string values', () => {
    expect(validateCode(123)).toMatchObject({ valid: false, error: 'code_must_be_string' });
    expect(validateCode(null)).toMatchObject({ valid: false, error: 'code_must_be_string' });
    expect(validateCode(undefined)).toMatchObject({ valid: false, error: 'code_must_be_string' });
  });

  it('rejects empty string', () => {
    expect(validateCode('')).toMatchObject({ valid: false, error: 'code_required' });
  });

  it('rejects code longer than MAX_CODE_LENGTH (2048)', () => {
    expect(validateCode('a'.repeat(MAX_CODE_LENGTH + 1))).toMatchObject({
      valid: false,
      error: 'code_too_long',
    });
  });

  it('rejects codes with non-printable ASCII (control chars, spaces)', () => {
    expect(validateCode('code with space')).toMatchObject({
      valid: false,
      error: 'code_invalid_format',
    });
    expect(validateCode('code\x00null')).toMatchObject({
      valid: false,
      error: 'code_invalid_format',
    });
    expect(validateCode('code\ttab')).toMatchObject({ valid: false, error: 'code_invalid_format' });
  });

  it('accepts a code exactly at MAX_CODE_LENGTH', () => {
    expect(validateCode('a'.repeat(MAX_CODE_LENGTH))).toEqual({ valid: true });
  });
});

// ---------------------------------------------------------------------------
// validateStateFormat
// ---------------------------------------------------------------------------
describe('validateStateFormat()', () => {
  const validUuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const validAlphanumeric = 'state_abc-123';

  it('accepts a valid UUID state', () => {
    expect(validateStateFormat(validUuid)).toEqual({ valid: true });
  });

  it('accepts alphanumeric state (with _ and -)', () => {
    expect(validateStateFormat(validAlphanumeric)).toEqual({ valid: true });
  });

  it('rejects null', () => {
    expect(validateStateFormat(null)).toMatchObject({ valid: false, error: 'state_required' });
  });

  it('rejects undefined', () => {
    expect(validateStateFormat(undefined)).toMatchObject({ valid: false, error: 'state_required' });
  });

  it('rejects non-string values', () => {
    expect(validateStateFormat(42)).toMatchObject({ valid: false, error: 'state_must_be_string' });
  });

  it('rejects empty string', () => {
    expect(validateStateFormat('')).toMatchObject({ valid: false, error: 'state_required' });
  });

  it('rejects state longer than MAX_STATE_LENGTH (128)', () => {
    expect(validateStateFormat('a'.repeat(MAX_STATE_LENGTH + 1))).toMatchObject({
      valid: false,
      error: 'state_too_long',
    });
  });

  it('rejects state with invalid chars (spaces, special chars)', () => {
    expect(validateStateFormat('state with spaces')).toMatchObject({
      valid: false,
      error: 'state_invalid_format',
    });
    expect(validateStateFormat('state@invalid!')).toMatchObject({
      valid: false,
      error: 'state_invalid_format',
    });
  });

  it('accepts UUID regardless of letter case', () => {
    expect(validateStateFormat(validUuid.toUpperCase())).toEqual({ valid: true });
  });
});

// ---------------------------------------------------------------------------
// decodeIdToken
// ---------------------------------------------------------------------------
describe('decodeIdToken()', () => {
  // Helper to create a minimal fake JWT with a given payload
  function makeJwt(payload: Record<string, unknown>): string {
    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify(payload));
    return `${header}.${body}.fakesignature`;
  }

  it('decodes a valid JWT payload', () => {
    const payload = { sub: 'user-123', email: 'test@cca.pt', name: 'Utilizador' };
    const decoded = decodeIdToken(makeJwt(payload));
    expect(decoded).toMatchObject(payload);
  });

  it('returns null for a token without 3 parts', () => {
    expect(decodeIdToken('only.twoparts')).toBeNull();
    expect(decodeIdToken('onepart')).toBeNull();
  });

  it('returns null for a completely invalid token', () => {
    expect(decodeIdToken('not.a.jwt')).toBeNull();
  });

  it('handles URL-safe base64 (- and _ chars in payload)', () => {
    // JSON with a value containing +/ so it becomes -_ in URL-safe base64
    const payload = { email: 'test@example.com', role: 'viewer' };
    // Build the token using URL-safe base64 encoding
    const headerB64 = btoa(JSON.stringify({ alg: 'RS256' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    const payloadB64 = btoa(JSON.stringify(payload))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    const jwt = `${headerB64}.${payloadB64}.sig`;
    const decoded = decodeIdToken(jwt);
    expect(decoded).toMatchObject(payload);
  });

  it('handles UTF-8 characters in payload (Portuguese names)', () => {
    const payload = { name: 'João Gonçalves', email: 'joao@cca.pt' };
    // Use TextEncoder/atob approach to produce proper base64
    const payloadStr = JSON.stringify(payload);
    const bytes = new TextEncoder().encode(payloadStr);
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    const payloadB64 = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const jwt = `header.${payloadB64}.sig`;
    const decoded = decodeIdToken(jwt);
    expect(decoded?.name).toBe('João Gonçalves');
  });
});

// ---------------------------------------------------------------------------
// generateSecurePassword
// ---------------------------------------------------------------------------
describe('generateSecurePassword()', () => {
  it('generates a password of 12 characters', () => {
    const pwd = generateSecurePassword();
    expect(pwd.length).toBe(12);
  });

  it('contains at least one uppercase letter', () => {
    // Run multiple times to account for randomness
    for (let i = 0; i < 20; i++) {
      expect(generateSecurePassword()).toMatch(/[A-Z]/);
    }
  });

  it('contains at least one lowercase letter', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateSecurePassword()).toMatch(/[a-z]/);
    }
  });

  it('contains at least one number', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateSecurePassword()).toMatch(/[0-9]/);
    }
  });

  it('contains at least one special character', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateSecurePassword()).toMatch(/[!@#$%&*]/);
    }
  });

  it('generates different passwords on successive calls', () => {
    const passwords = new Set(Array.from({ length: 10 }, () => generateSecurePassword()));
    // With 12-char random passwords, collision probability is astronomically low
    expect(passwords.size).toBeGreaterThan(1);
  });

  it('uses crypto.getRandomValues (not Math.random)', () => {
    // Spy on crypto.getRandomValues to confirm we're using the secure CSPRNG.
    const spy = vi.spyOn(crypto, 'getRandomValues');
    generateSecurePassword();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// secureRandomInt — bounds and uniformity sanity check
// ---------------------------------------------------------------------------
describe('secureRandomInt()', () => {
  it('always returns a value in [0, max)', () => {
    for (let i = 0; i < 200; i++) {
      const n = secureRandomInt(10);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(10);
    }
  });

  it('throws for non-positive range', () => {
    expect(() => secureRandomInt(0)).toThrow();
    expect(() => secureRandomInt(-1)).toThrow();
  });

  it('produces a roughly uniform distribution', () => {
    const buckets = new Array(10).fill(0) as number[];
    for (let i = 0; i < 5000; i++) buckets[secureRandomInt(10)]++;
    // each bucket should hold ~500 with 5000 samples; allow generous tolerance
    for (const c of buckets) {
      expect(c).toBeGreaterThan(300);
      expect(c).toBeLessThan(700);
    }
  });
});

// ---------------------------------------------------------------------------
// _shared/rateLimit.ts — sliding-window-ish bucket logic (replicated)
// ---------------------------------------------------------------------------
interface Bucket {
  count: number;
  resetAt: number;
}
interface BucketStore {
  buckets: Map<string, Bucket>;
}
const _stores = new Map<string, BucketStore>();
function getStore(scope: string): BucketStore {
  let store = _stores.get(scope);
  if (!store) {
    store = { buckets: new Map() };
    _stores.set(scope, store);
  }
  return store;
}
interface RateLimitOptions {
  windowMs: number;
  max: number;
}
interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
  resetAt: number;
}
function rateLimit(scope: string, key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const store = getStore(scope);
  const bucket = store.buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    const resetAt = now + opts.windowMs;
    store.buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: opts.max - 1, retryAfter: 0, resetAt };
  }
  if (bucket.count >= opts.max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      resetAt: bucket.resetAt,
    };
  }
  bucket.count++;
  return {
    allowed: true,
    remaining: Math.max(0, opts.max - bucket.count),
    retryAfter: 0,
    resetAt: bucket.resetAt,
  };
}

describe('rateLimit()', () => {
  beforeEach(() => {
    _stores.clear();
  });

  it('allows up to max requests within the window', () => {
    for (let i = 0; i < 5; i++) {
      const r = rateLimit('test', 'k', { windowMs: 60_000, max: 5 });
      expect(r.allowed).toBe(true);
    }
  });

  it('blocks the (max+1)-th request and reports retryAfter', () => {
    for (let i = 0; i < 3; i++) rateLimit('test', 'k', { windowMs: 60_000, max: 3 });
    const r = rateLimit('test', 'k', { windowMs: 60_000, max: 3 });
    expect(r.allowed).toBe(false);
    expect(r.retryAfter).toBeGreaterThan(0);
    expect(r.remaining).toBe(0);
  });

  it('isolates buckets per key', () => {
    for (let i = 0; i < 3; i++) rateLimit('test', 'a', { windowMs: 60_000, max: 3 });
    const r = rateLimit('test', 'b', { windowMs: 60_000, max: 3 });
    expect(r.allowed).toBe(true);
  });

  it('isolates buckets per scope', () => {
    for (let i = 0; i < 3; i++) rateLimit('scope-a', 'k', { windowMs: 60_000, max: 3 });
    const r = rateLimit('scope-b', 'k', { windowMs: 60_000, max: 3 });
    expect(r.allowed).toBe(true);
  });

  it('resets the bucket after the window expires', () => {
    vi.useFakeTimers();
    try {
      for (let i = 0; i < 3; i++) rateLimit('test', 'k', { windowMs: 1_000, max: 3 });
      expect(rateLimit('test', 'k', { windowMs: 1_000, max: 3 }).allowed).toBe(false);
      vi.advanceTimersByTime(1_500);
      expect(rateLimit('test', 'k', { windowMs: 1_000, max: 3 }).allowed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

// ---------------------------------------------------------------------------
// _shared/cors.ts — fail-closed origin policy (replicated)
// ---------------------------------------------------------------------------
function makeCorsResolver(allowedRaw: string, devMode: boolean) {
  const allowedOrigins = allowedRaw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return function resolve(origin: string): string | null {
    if (allowedOrigins.length === 0) return devMode ? '*' : null;
    if (allowedOrigins.includes('*')) {
      if (devMode) return '*';
      const concrete = allowedOrigins.find((o) => o !== '*');
      return concrete ?? null;
    }
    if (origin && allowedOrigins.includes(origin)) return origin;
    return null;
  };
}

describe('CORS resolver (fail-closed)', () => {
  it('returns null when ALLOWED_ORIGIN is empty in production (no fallback to *)', () => {
    const resolve = makeCorsResolver('', false);
    expect(resolve('https://app.example.com')).toBeNull();
  });

  it('returns * when ALLOWED_ORIGIN is empty in dev mode only', () => {
    const resolve = makeCorsResolver('', true);
    expect(resolve('https://app.example.com')).toBe('*');
  });

  it('echoes back an explicitly allowed origin', () => {
    const resolve = makeCorsResolver(
      'https://app.cca-legal.pt,https://staging.cca-legal.pt',
      false,
    );
    expect(resolve('https://app.cca-legal.pt')).toBe('https://app.cca-legal.pt');
    expect(resolve('https://staging.cca-legal.pt')).toBe('https://staging.cca-legal.pt');
  });

  it('rejects origins not on the allow-list', () => {
    const resolve = makeCorsResolver('https://app.cca-legal.pt', false);
    expect(resolve('https://evil.com')).toBeNull();
  });

  it('never returns * in production even if * is in the list', () => {
    const resolve = makeCorsResolver('*,https://app.cca-legal.pt', false);
    expect(resolve('https://app.cca-legal.pt')).toBe('https://app.cca-legal.pt');
    // Random origin still gets the concrete fallback (still safer than *)
    expect(resolve('https://other.com')).toBe('https://app.cca-legal.pt');
  });

  it('returns * in dev mode when wildcard is configured', () => {
    const resolve = makeCorsResolver('*', true);
    expect(resolve('https://anything.com')).toBe('*');
  });
});
