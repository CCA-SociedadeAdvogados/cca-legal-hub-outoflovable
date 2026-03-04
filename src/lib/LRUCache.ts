/**
 * Simple LRU (Least Recently Used) Cache implementation
 * Used for in-memory translation caching
 */
export class LRUCache<T> {
  private cache = new Map<string, { value: T; accessOrder: number }>();
  private maxSize: number;
  private counter = 0;

  constructor(maxSize = 500) {
    this.maxSize = maxSize;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Update access order (LRU)
    entry.accessOrder = ++this.counter;
    return entry.value;
  }

  set(key: string, value: T): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }
    this.cache.set(key, { value, accessOrder: ++this.counter });
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestOrder = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.accessOrder < oldestOrder) {
        oldestOrder = entry.accessOrder;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}
