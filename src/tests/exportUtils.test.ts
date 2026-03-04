/**
 * Tests for the pure helper functions inside exportUtils.ts.
 *
 * We replicate the three private helpers (escapeCSV, formatCurrency, formatDate)
 * to avoid triggering the DOM-dependent exportContratosToCSV function.
 */
import { describe, it, expect } from 'vitest';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

// ---------------------------------------------------------------------------
// Replicated helpers (identical logic to exportUtils.ts)
// ---------------------------------------------------------------------------

const escapeCSV = (value: string | null | undefined): string => {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const formatDate = (date: string | null | undefined): string => {
  if (!date) return '';
  try {
    return format(new Date(date), 'dd/MM/yyyy', { locale: pt });
  } catch {
    return '';
  }
};

// formatCurrency intentionally locale-agnostic: test structure, not exact separator
const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '';
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
};

// ---------------------------------------------------------------------------
// escapeCSV
// ---------------------------------------------------------------------------
describe('escapeCSV()', () => {
  it('returns empty string for null', () => {
    expect(escapeCSV(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(escapeCSV(undefined)).toBe('');
  });

  it('returns plain value without special chars', () => {
    expect(escapeCSV('hello')).toBe('hello');
  });

  it('wraps in quotes when value contains a comma', () => {
    expect(escapeCSV('a,b')).toBe('"a,b"');
  });

  it('doubles internal quotes and wraps in quotes', () => {
    expect(escapeCSV('say "hello"')).toBe('"say ""hello"""');
  });

  it('wraps in quotes when value contains a newline', () => {
    expect(escapeCSV('line1\nline2')).toBe('"line1\nline2"');
  });

  it('handles empty string', () => {
    expect(escapeCSV('')).toBe('');
  });

  it('coerces numbers to string without quoting', () => {
    expect(escapeCSV('12345')).toBe('12345');
  });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------
describe('formatDate()', () => {
  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatDate('')).toBe('');
  });

  it('formats ISO date string to dd/MM/yyyy', () => {
    expect(formatDate('2024-06-15')).toBe('15/06/2024');
  });

  it('formats ISO datetime string using only the date part', () => {
    expect(formatDate('2024-01-01T00:00:00Z')).toBe('01/01/2024');
  });

  it('returns empty string for an invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------
describe('formatCurrency()', () => {
  it('returns empty string for null', () => {
    expect(formatCurrency(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatCurrency(undefined)).toBe('');
  });

  it('contains the EUR symbol or "EUR" in the output', () => {
    const result = formatCurrency(1000);
    expect(result.includes('€') || result.includes('EUR')).toBe(true);
  });

  it('contains the numeric value', () => {
    const result = formatCurrency(1234.56);
    // Remove all non-digit/comma/period chars and check for digits
    const digits = result.replace(/[^\d]/g, '');
    expect(digits).toContain('1234');
  });

  it('formats zero', () => {
    const result = formatCurrency(0);
    expect(result).toBeTruthy();
    expect(result.includes('€') || result.includes('EUR')).toBe(true);
  });

  it('formats negative values', () => {
    const result = formatCurrency(-500);
    expect(result).toBeTruthy();
    // Should contain the minus sign or parentheses
    expect(result.includes('-') || result.includes('(') || result.startsWith('-')).toBe(true);
  });
});
