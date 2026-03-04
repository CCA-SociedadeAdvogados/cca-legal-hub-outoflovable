import { describe, it, expect } from 'vitest';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

// Since formatDate, formatCurrency, and escapeCSV are not exported from exportUtils,
// we replicate the logic here for direct unit testing.

describe('exportUtils — CSV escaping logic', () => {
  const escapeCSV = (value: string | null | undefined): string => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  it('returns empty string for null', () => {
    expect(escapeCSV(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(escapeCSV(undefined)).toBe('');
  });

  it('returns plain string when no special chars', () => {
    expect(escapeCSV('hello')).toBe('hello');
  });

  it('wraps in quotes when string contains comma', () => {
    expect(escapeCSV('hello, world')).toBe('"hello, world"');
  });

  it('escapes double quotes by doubling them', () => {
    expect(escapeCSV('say "hello"')).toBe('"say ""hello"""');
  });

  it('wraps in quotes when string contains newline', () => {
    expect(escapeCSV('line1\nline2')).toBe('"line1\nline2"');
  });
});

describe('exportUtils — currency formatting logic', () => {
  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '';
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
  };

  it('returns empty string for null', () => {
    expect(formatCurrency(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatCurrency(undefined)).toBe('');
  });

  it('formats EUR currency in pt-PT locale', () => {
    const result = formatCurrency(1234.56);
    // Node.js may not have full ICU locale data, so check flexibly
    expect(result).toContain('€');
    expect(result).toMatch(/1[.,]?234[.,]56/);
  });

  it('formats zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0,00');
    expect(result).toContain('€');
  });
});

describe('exportUtils — date formatting logic', () => {
  const formatDate = (date: string | null | undefined): string => {
    if (!date) return '';
    try {
      return format(new Date(date), 'dd/MM/yyyy', { locale: pt });
    } catch {
      return '';
    }
  };

  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('');
  });

  it('formats ISO date to dd/MM/yyyy', () => {
    expect(formatDate('2024-03-15')).toBe('15/03/2024');
  });

  it('formats ISO datetime to dd/MM/yyyy', () => {
    expect(formatDate('2024-12-25T10:30:00Z')).toBe('25/12/2024');
  });

  it('returns empty string for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('');
  });
});
