import { describe, it, expect } from 'vitest';
import { LRUCache } from '@/lib/LRUCache';

describe('LRUCache', () => {
  it('stores and retrieves values', () => {
    const cache = new LRUCache<string>(10);
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('returns null for missing keys', () => {
    const cache = new LRUCache<string>(10);
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('reports has() correctly', () => {
    const cache = new LRUCache<string>(10);
    cache.set('key1', 'value1');
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('key2')).toBe(false);
  });

  it('reports size correctly', () => {
    const cache = new LRUCache<string>(10);
    expect(cache.size()).toBe(0);
    cache.set('a', '1');
    cache.set('b', '2');
    expect(cache.size()).toBe(2);
  });

  it('overwrites existing key without increasing size', () => {
    const cache = new LRUCache<string>(10);
    cache.set('key', 'old');
    cache.set('key', 'new');
    expect(cache.get('key')).toBe('new');
    expect(cache.size()).toBe(1);
  });

  it('evicts least recently used when at capacity', () => {
    const cache = new LRUCache<string>(3);
    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('c', '3');
    // All three should be present
    expect(cache.size()).toBe(3);

    // Adding a 4th should evict 'a' (oldest)
    cache.set('d', '4');
    expect(cache.size()).toBe(3);
    expect(cache.get('a')).toBeNull();
    expect(cache.get('d')).toBe('4');
  });

  it('accessing a key makes it recently used (not evicted)', () => {
    const cache = new LRUCache<string>(3);
    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('c', '3');

    // Access 'a' to make it recently used
    cache.get('a');

    // Add 'd' — should evict 'b' (now oldest), not 'a'
    cache.set('d', '4');
    expect(cache.get('a')).toBe('1');
    expect(cache.get('b')).toBeNull();
  });

  it('clear() removes all entries', () => {
    const cache = new LRUCache<string>(10);
    cache.set('a', '1');
    cache.set('b', '2');
    cache.clear();
    expect(cache.size()).toBe(0);
    expect(cache.get('a')).toBeNull();
  });

  it('defaults to maxSize 500', () => {
    const cache = new LRUCache<number>();
    for (let i = 0; i < 500; i++) {
      cache.set(`key${i}`, i);
    }
    expect(cache.size()).toBe(500);

    // 501st should trigger eviction
    cache.set('overflow', 999);
    expect(cache.size()).toBe(500);
  });

  it('works with different value types', () => {
    const objCache = new LRUCache<{ name: string }>(5);
    objCache.set('user', { name: 'João' });
    expect(objCache.get('user')).toEqual({ name: 'João' });

    const numCache = new LRUCache<number>(5);
    numCache.set('count', 42);
    expect(numCache.get('count')).toBe(42);
  });
});
