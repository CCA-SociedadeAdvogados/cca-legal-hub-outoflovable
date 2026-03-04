/**
 * Tests for pure functions extracted from Supabase Edge Functions.
 *
 * Edge functions run in Deno and can't be imported directly into Vitest (Node).
 * We replicate the pure function implementations here to test the logic.
 * If a function changes in the edge function, the corresponding logic here
 * must be updated to match — this is intentional until we extract a shared lib.
 *
 * Covered:
 * - sso-cca: decodeIdToken, validateCode, validateStateFormat
 * - analyze-compliance: validateUUID, validateStringArray, validateTextContent, truncateForAI
 * - admin-create-user: generateSecurePassword
 */
import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════════════
// sso-cca/index.ts — Pure functions
// ═══════════════════════════════════════════════════════════════════════════════

const MAX_CODE_LENGTH = 2048;
const MAX_STATE_LENGTH = 128;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALPHANUMERIC_REGEX = /^[a-zA-Z0-9_-]+$/;

function decodeIdToken(idToken: string): Record<string, unknown> | null {
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const binaryString = atob(payload);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const decoded = new TextDecoder("utf-8").decode(bytes);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function validateCode(code: unknown): { valid: boolean; error?: string } {
  if (typeof code !== "string") return { valid: false, error: "code_must_be_string" };
  if (code.length === 0) return { valid: false, error: "code_required" };
  if (code.length > MAX_CODE_LENGTH) return { valid: false, error: "code_too_long" };
  if (!/^[\x21-\x7E]+$/.test(code)) return { valid: false, error: "code_invalid_format" };
  return { valid: true };
}

function validateStateFormat(state: unknown): { valid: boolean; error?: string } {
  if (state === null || state === undefined) return { valid: false, error: "state_required" };
  if (typeof state !== "string") return { valid: false, error: "state_must_be_string" };
  if (state.length === 0) return { valid: false, error: "state_required" };
  if (state.length > MAX_STATE_LENGTH) return { valid: false, error: "state_too_long" };
  if (!UUID_REGEX.test(state) && !ALPHANUMERIC_REGEX.test(state)) return { valid: false, error: "state_invalid_format" };
  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// analyze-compliance/index.ts — Validation helpers
// ═══════════════════════════════════════════════════════════════════════════════

const MAX_TEXT_CONTENT_LENGTH = 500000;
const MAX_CHARS_AI = 30000;
const MAX_ARRAY_LENGTH = 100;

function validateUUID(id: unknown): boolean {
  return typeof id === "string" && UUID_REGEX.test(id);
}

function validateStringArray(arr: unknown, maxLength: number = MAX_ARRAY_LENGTH): boolean {
  if (!Array.isArray(arr)) return false;
  if (arr.length > maxLength) return false;
  return arr.every(item => typeof item === "string" && item.length < 255);
}

function validateTextContent(text: unknown): { valid: boolean; error?: string } {
  if (text === undefined || text === null) return { valid: true };
  if (typeof text !== "string") return { valid: false, error: "textContent must be a string" };
  if (text.length > MAX_TEXT_CONTENT_LENGTH) return { valid: false, error: `textContent exceeds maximum length of ${MAX_TEXT_CONTENT_LENGTH} characters` };
  return { valid: true };
}

function truncateForAI(text: string): string {
  if (text.length <= MAX_CHARS_AI) return text;
  return text.substring(0, MAX_CHARS_AI) + "\n\n[Nota: texto truncado — apenas os primeiros 30 000 caracteres foram analisados]";
}

// ═══════════════════════════════════════════════════════════════════════════════
// admin-create-user/index.ts — Password generation
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('sso-cca: decodeIdToken', () => {
  it('decodes a valid JWT payload', () => {
    // Build a JWT with header.payload.signature
    const payload = { email: 'test@cca.pt', name: 'Test User', sub: '123' };
    const encoded = btoa(JSON.stringify(payload));
    const jwt = `eyJhbGciOiJSUzI1NiJ9.${encoded}.fake-signature`;

    const result = decodeIdToken(jwt);
    expect(result).toEqual(payload);
  });

  it('handles URL-safe base64 encoding', () => {
    const payload = { email: 'test+special@cca.pt' };
    // Use URL-safe base64 (- and _ instead of + and /)
    const encoded = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_');
    const jwt = `header.${encoded}.sig`;

    const result = decodeIdToken(jwt);
    expect(result?.email).toBe('test+special@cca.pt');
  });

  it('handles UTF-8 characters (Portuguese names)', () => {
    const payload = { name: 'José María García' };
    const jsonStr = JSON.stringify(payload);
    // Encode with proper UTF-8 handling
    const bytes = new TextEncoder().encode(jsonStr);
    let binary = '';
    for (const b of bytes) {
      binary += String.fromCharCode(b);
    }
    const encoded = btoa(binary);
    const jwt = `header.${encoded}.sig`;

    const result = decodeIdToken(jwt);
    expect(result?.name).toBe('José María García');
  });

  it('returns null for invalid JWT (wrong number of parts)', () => {
    expect(decodeIdToken('not-a-jwt')).toBeNull();
    expect(decodeIdToken('only.two')).toBeNull();
    expect(decodeIdToken('a.b.c.d')).toBeNull();
  });

  it('returns null for invalid base64 payload', () => {
    expect(decodeIdToken('header.!!!invalid!!!.sig')).toBeNull();
  });

  it('returns null for non-JSON payload', () => {
    const encoded = btoa('this is not json');
    expect(decodeIdToken(`header.${encoded}.sig`)).toBeNull();
  });
});

describe('sso-cca: validateCode', () => {
  it('accepts valid OAuth code', () => {
    expect(validateCode('abc123XYZ')).toEqual({ valid: true });
  });

  it('accepts codes with special printable ASCII', () => {
    // RFC 6749 allows VSCHAR (0x21-0x7E)
    expect(validateCode('code!with*special@chars')).toEqual({ valid: true });
  });

  it('rejects non-string input', () => {
    expect(validateCode(123).valid).toBe(false);
    expect(validateCode(null).valid).toBe(false);
    expect(validateCode(undefined).valid).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateCode('').error).toBe('code_required');
  });

  it('rejects code exceeding max length', () => {
    const longCode = 'a'.repeat(MAX_CODE_LENGTH + 1);
    expect(validateCode(longCode).error).toBe('code_too_long');
  });

  it('rejects code with non-printable characters', () => {
    expect(validateCode('code\nwith\nnewlines').valid).toBe(false);
    expect(validateCode('code with spaces').valid).toBe(false);
    expect(validateCode('code\x00null').valid).toBe(false);
  });

  it('accepts max-length code', () => {
    const maxCode = 'a'.repeat(MAX_CODE_LENGTH);
    expect(validateCode(maxCode).valid).toBe(true);
  });
});

describe('sso-cca: validateStateFormat', () => {
  it('accepts valid UUID state', () => {
    expect(validateStateFormat('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toEqual({ valid: true });
  });

  it('accepts alphanumeric state', () => {
    expect(validateStateFormat('abc123_XYZ-test')).toEqual({ valid: true });
  });

  it('rejects null/undefined', () => {
    expect(validateStateFormat(null).error).toBe('state_required');
    expect(validateStateFormat(undefined).error).toBe('state_required');
  });

  it('rejects non-string', () => {
    expect(validateStateFormat(42).error).toBe('state_must_be_string');
  });

  it('rejects empty string', () => {
    expect(validateStateFormat('').error).toBe('state_required');
  });

  it('rejects state exceeding max length', () => {
    expect(validateStateFormat('a'.repeat(MAX_STATE_LENGTH + 1)).error).toBe('state_too_long');
  });

  it('rejects state with invalid characters', () => {
    expect(validateStateFormat('state with spaces').valid).toBe(false);
    expect(validateStateFormat('state!@#$').valid).toBe(false);
    expect(validateStateFormat('<script>alert(1)</script>').valid).toBe(false);
  });
});

describe('analyze-compliance: validateUUID', () => {
  it('accepts valid UUID v4', () => {
    expect(validateUUID('e33bf0c9-71b9-491b-8054-d4c88d8bb4ee')).toBe(true);
  });

  it('accepts uppercase UUIDs', () => {
    expect(validateUUID('E33BF0C9-71B9-491B-8054-D4C88D8BB4EE')).toBe(true);
  });

  it('rejects non-string', () => {
    expect(validateUUID(123)).toBe(false);
    expect(validateUUID(null)).toBe(false);
    expect(validateUUID(undefined)).toBe(false);
  });

  it('rejects malformed UUIDs', () => {
    expect(validateUUID('not-a-uuid')).toBe(false);
    expect(validateUUID('e33bf0c9-71b9-491b-8054')).toBe(false);
    expect(validateUUID('e33bf0c9-71b9-491b-8054-d4c88d8bb4ee-extra')).toBe(false);
    expect(validateUUID('')).toBe(false);
  });

  it('rejects UUID with invalid characters', () => {
    expect(validateUUID('g33bf0c9-71b9-491b-8054-d4c88d8bb4ee')).toBe(false);
    expect(validateUUID('e33bf0c9-71b9-491b-8054-d4c88d8bb4ez')).toBe(false);
  });
});

describe('analyze-compliance: validateStringArray', () => {
  it('accepts valid string array', () => {
    expect(validateStringArray(['hello', 'world'])).toBe(true);
  });

  it('accepts empty array', () => {
    expect(validateStringArray([])).toBe(true);
  });

  it('rejects non-array', () => {
    expect(validateStringArray('not-an-array')).toBe(false);
    expect(validateStringArray(null)).toBe(false);
    expect(validateStringArray(42)).toBe(false);
  });

  it('rejects array with non-string items', () => {
    expect(validateStringArray([1, 2, 3])).toBe(false);
    expect(validateStringArray(['valid', 42])).toBe(false);
  });

  it('rejects array exceeding max length', () => {
    const bigArray = Array.from({ length: 101 }, (_, i) => `item-${i}`);
    expect(validateStringArray(bigArray)).toBe(false);
  });

  it('accepts custom max length', () => {
    expect(validateStringArray(['a', 'b', 'c'], 3)).toBe(true);
    expect(validateStringArray(['a', 'b', 'c', 'd'], 3)).toBe(false);
  });

  it('rejects strings over 254 characters', () => {
    expect(validateStringArray(['a'.repeat(255)])).toBe(false);
    expect(validateStringArray(['a'.repeat(254)])).toBe(true);
  });
});

describe('analyze-compliance: validateTextContent', () => {
  it('accepts null/undefined (optional field)', () => {
    expect(validateTextContent(null)).toEqual({ valid: true });
    expect(validateTextContent(undefined)).toEqual({ valid: true });
  });

  it('accepts valid text', () => {
    expect(validateTextContent('Hello world')).toEqual({ valid: true });
  });

  it('rejects non-string', () => {
    expect(validateTextContent(42).valid).toBe(false);
    expect(validateTextContent({}).valid).toBe(false);
  });

  it('rejects text exceeding 500KB', () => {
    const bigText = 'a'.repeat(500001);
    expect(validateTextContent(bigText).valid).toBe(false);
    expect(validateTextContent(bigText).error).toContain('500000');
  });

  it('accepts text at exactly max length', () => {
    expect(validateTextContent('a'.repeat(500000)).valid).toBe(true);
  });
});

describe('analyze-compliance: truncateForAI', () => {
  it('returns text unchanged if under limit', () => {
    const text = 'Short text';
    expect(truncateForAI(text)).toBe(text);
  });

  it('returns text unchanged at exactly 30000 chars', () => {
    const text = 'a'.repeat(30000);
    expect(truncateForAI(text)).toBe(text);
  });

  it('truncates text over 30000 chars with Portuguese notice', () => {
    const text = 'a'.repeat(50000);
    const result = truncateForAI(text);
    expect(result.length).toBeLessThan(text.length);
    expect(result).toContain('texto truncado');
    expect(result).toContain('30 000');
    expect(result.startsWith('a'.repeat(30000))).toBe(true);
  });
});

describe('admin-create-user: generateSecurePassword', () => {
  it('generates a 12-character password', () => {
    const pw = generateSecurePassword();
    expect(pw).toHaveLength(12);
  });

  it('contains at least one uppercase letter', () => {
    // Run multiple times due to random shuffling
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

  it('generates different passwords each time', () => {
    const passwords = new Set(Array.from({ length: 50 }, () => generateSecurePassword()));
    // With 12 chars and a large charset, collisions should be extremely rare
    expect(passwords.size).toBeGreaterThan(45);
  });
});
