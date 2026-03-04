import { describe, it, expect, beforeEach } from 'vitest';
import { LRUCache } from '@/lib/LRUCache';

describe('LRUCache', () => {
  let cache: LRUCache<string>;

  beforeEach(() => {
    cache = new LRUCache<string>(3);
  });

  // ---------------------------------------------------------------------------
  // Basic get / set
  // ---------------------------------------------------------------------------
  it('returns null for a missing key', () => {
    expect(cache.get('missing')).toBeNull();
  });

  it('stores and retrieves a value', () => {
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');
  });

  it('overwriting a key updates the value', () => {
    cache.set('key', 'old');
    cache.set('key', 'new');
    expect(cache.get('key')).toBe('new');
  });

  it('has() returns true for existing keys, false for missing', () => {
    cache.set('a', 'x');
    expect(cache.has('a')).toBe(true);
    expect(cache.has('z')).toBe(false);
  });

  it('size() reflects the number of cached entries', () => {
    expect(cache.size()).toBe(0);
    cache.set('a', '1');
    cache.set('b', '2');
    expect(cache.size()).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // LRU eviction — monotonic counter guarantees deterministic order
  // ---------------------------------------------------------------------------
  it('evicts the least recently used entry when at capacity', () => {
    // Fill to capacity (3)
    cache.set('a', 'A');
    cache.set('b', 'B');
    cache.set('c', 'C');

    // Access 'a' → 'a' is now most-recently used
    cache.get('a');

    // Add 'd' → should evict 'b' (oldest not accessed)
    cache.set('d', 'D');

    expect(cache.has('a')).toBe(true);   // recently used
    expect(cache.has('b')).toBe(false);  // evicted (least recently used)
    expect(cache.has('c')).toBe(true);
    expect(cache.has('d')).toBe(true);
    expect(cache.size()).toBe(3);
  });

  it('evicts FIFO when no keys were accessed after insertion', () => {
    // Fill to capacity — 'a' is oldest
    cache.set('a', 'A');
    cache.set('b', 'B');
    cache.set('c', 'C');

    // Add 'd' — should evict 'a' (oldest insertion, never re-accessed)
    cache.set('d', 'D');

    expect(cache.has('a')).toBe(false);
    expect(cache.has('b')).toBe(true);
    expect(cache.has('c')).toBe(true);
    expect(cache.has('d')).toBe(true);
  });

  it('overwriting an existing key does not cause extra eviction', () => {
    cache.set('a', 'A');
    cache.set('b', 'B');
    cache.set('c', 'C');
    // Overwrite 'a' — size stays at 3, no eviction needed
    cache.set('a', 'A2');
    expect(cache.size()).toBe(3);
    expect(cache.get('a')).toBe('A2');
  });

  // ---------------------------------------------------------------------------
  // clear()
  // ---------------------------------------------------------------------------
  it('clear() empties the cache', () => {
    cache.set('a', 'A');
    cache.set('b', 'B');
    cache.clear();
    expect(cache.size()).toBe(0);
    expect(cache.get('a')).toBeNull();
    expect(cache.get('b')).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Generic types
  // ---------------------------------------------------------------------------
  it('works with number values', () => {
    const numCache = new LRUCache<number>(2);
    numCache.set('x', 42);
    expect(numCache.get('x')).toBe(42);
  });

  it('works with object values', () => {
    const objCache = new LRUCache<{ name: string }>(2);
    objCache.set('user', { name: 'Ana' });
    expect(objCache.get('user')).toEqual({ name: 'Ana' });
  });
});
