/**
 * Tests for pure business-logic functions extracted from Supabase Edge Functions.
 *
 * Edge functions use Deno APIs so we can't import them directly.
 * We replicate the pure functions here — the logic is identical.
 */
import { describe, it, expect } from 'vitest';

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
// admin-create-user/index.ts — generateSecurePassword
// ---------------------------------------------------------------------------
function generateSecurePassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%&*';
  const allChars = uppercase + lowercase + numbers + special;
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  for (let i = 0; i < 8; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  return password.split('').sort(() => Math.random() - 0.5).join('');
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
    expect(validateCode('code with space')).toMatchObject({ valid: false, error: 'code_invalid_format' });
    expect(validateCode('code\x00null')).toMatchObject({ valid: false, error: 'code_invalid_format' });
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
    const headerB64 = btoa(JSON.stringify({ alg: 'RS256' })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
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
});
