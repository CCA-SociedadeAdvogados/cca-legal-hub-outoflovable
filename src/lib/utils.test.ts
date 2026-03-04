import { describe, it, expect } from 'vitest';
import { cn, generateSlug } from '@/lib/utils';

describe('cn()', () => {
  it('merges class names', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });

  it('deduplicates tailwind conflicts (last wins)', () => {
    expect(cn('px-4', 'px-6')).toBe('px-6');
  });

  it('handles undefined and null gracefully', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end');
  });

  it('returns empty string for no input', () => {
    expect(cn()).toBe('');
  });
});

describe('generateSlug()', () => {
  it('converts to lowercase', () => {
    expect(generateSlug('CCA Legal Hub')).toBe('cca-legal-hub');
  });

  it('removes Portuguese accents', () => {
    expect(generateSlug('Organização São João')).toBe('organizacao-sao-joao');
  });

  it('replaces special characters with hyphens', () => {
    expect(generateSlug('test & demo (v2)')).toBe('test-demo-v2');
  });

  it('removes leading and trailing hyphens', () => {
    expect(generateSlug('--hello world--')).toBe('hello-world');
  });

  it('collapses multiple special characters into single hyphen', () => {
    expect(generateSlug('a   b   c')).toBe('a-b-c');
  });

  it('handles empty string', () => {
    expect(generateSlug('')).toBe('');
  });

  it('handles string with only special characters', () => {
    expect(generateSlug('!@#$%')).toBe('');
  });

  it('preserves numbers', () => {
    expect(generateSlug('CCA 2024 Q1')).toBe('cca-2024-q1');
  });

  it('handles complex Portuguese text', () => {
    expect(generateSlug('Prestação de Serviços Jurídicos')).toBe('prestacao-de-servicos-juridicos');
  });
});
