import { describe, it, expect } from 'vitest';
import { cn, generateSlug } from '@/lib/utils';

// ---------------------------------------------------------------------------
// cn() — className merge utility (clsx + tailwind-merge)
// ---------------------------------------------------------------------------
describe('cn()', () => {
  it('joins simple class strings', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('ignores falsy values (undefined, null, false, empty string)', () => {
    expect(cn('a', undefined, null, false, '', 'b')).toBe('a b');
  });

  it('handles conditional objects from clsx', () => {
    expect(cn({ 'text-red-500': true, 'text-blue-500': false })).toBe('text-red-500');
  });

  it('merges conflicting Tailwind utilities (last wins via tailwind-merge)', () => {
    // tailwind-merge resolves conflicts: bg-red-500 wins over bg-blue-500
    expect(cn('bg-blue-500', 'bg-red-500')).toBe('bg-red-500');
  });

  it('deduplicates identical classes', () => {
    // tailwind-merge removes the earlier duplicate
    const result = cn('p-4', 'p-4');
    expect(result).toBe('p-4');
  });

  it('preserves non-conflicting classes', () => {
    const result = cn('flex', 'items-center', 'justify-between');
    expect(result).toContain('flex');
    expect(result).toContain('items-center');
    expect(result).toContain('justify-between');
  });

  it('handles arrays of classes', () => {
    expect(cn(['a', 'b'], 'c')).toBe('a b c');
  });

  it('returns empty string when called with no args', () => {
    expect(cn()).toBe('');
  });

  it('handles nested arrays and objects', () => {
    const active = true;
    expect(cn('base', { 'active-class': active, 'inactive-class': !active }))
      .toBe('base active-class');
  });
});

// ---------------------------------------------------------------------------
// generateSlug()
// ---------------------------------------------------------------------------
describe('generateSlug()', () => {
  it('converts to lowercase', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });

  it('replaces spaces with hyphens', () => {
    expect(generateSlug('Meu Contrato')).toBe('meu-contrato');
  });

  it('removes Portuguese accents', () => {
    expect(generateSlug('Aviação')).toBe('aviacao');
    expect(generateSlug('Configuração')).toBe('configuracao');
    expect(generateSlug('Português')).toBe('portugues');
    expect(generateSlug('Gestão de Contratos')).toBe('gestao-de-contratos');
  });

  it('handles ã, õ, ç and other PT-specific chars', () => {
    expect(generateSlug('Intenção')).toBe('intencao');
    expect(generateSlug('coração')).toBe('coracao');
    expect(generateSlug('ação')).toBe('acao');
  });

  it('replaces special characters with hyphens', () => {
    expect(generateSlug('CCA & Associados')).toBe('cca-associados');
    expect(generateSlug('Contrato (v2)')).toBe('contrato-v2');
  });

  it('collapses multiple consecutive hyphens', () => {
    expect(generateSlug('a  b')).toBe('a-b');     // double space
    expect(generateSlug('a--b')).toBe('a-b');     // explicit double hyphen
  });

  it('strips leading and trailing hyphens', () => {
    expect(generateSlug('  leading')).toBe('leading');
    expect(generateSlug('trailing  ')).toBe('trailing');
    expect(generateSlug(' both sides ')).toBe('both-sides');
  });

  it('handles numbers', () => {
    expect(generateSlug('Contrato 2024')).toBe('contrato-2024');
    expect(generateSlug('NDA 001')).toBe('nda-001');
  });

  it('returns empty string for empty input', () => {
    expect(generateSlug('')).toBe('');
  });

  it('handles already-slugified input unchanged', () => {
    expect(generateSlug('meu-contrato')).toBe('meu-contrato');
  });
});
