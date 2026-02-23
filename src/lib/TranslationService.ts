/**
 * TranslationService - Centralized translation management
 * 
 * Features:
 * - LRU in-memory cache for fast access
 * - IndexedDB for persistence (async, non-blocking)
 * - AbortController for cancelling in-flight requests
 * - Batch writes to reduce I/O
 * - Tenant isolation via cache keys
 * - One-time localStorage migration
 */
import { LRUCache } from './LRUCache';
import { openDB, getItem, setItems, clearOldItems } from './IndexedDBCache';
import { supabase } from '@/integrations/supabase/client';

class TranslationService {
  private memoryCache = new LRUCache<string>(500);
  private writeQueue = new Map<string, string>();
  private flushTimer: number | null = null;
  private abortController: AbortController | null = null;
  private migrated = false;
  private initialized = false;

  /**
   * Generate a robust cache key
   */
  private getCacheKey(original: string, targetLang: string, tenantId?: string): string {
    const hash = this.hashCode(original);
    const tenant = tenantId || 'global';
    return `t_${tenant}_${targetLang}_${hash}`;
  }

  /**
   * Simple hash function for content
   */
  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Abort any in-flight translation requests
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Initialize the service (call once on app start)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    
    try {
      // Pre-open IndexedDB
      await openDB();
      // Cleanup old entries (older than 7 days)
      await clearOldItems();
      // Migrate from localStorage
      await this.migrateFromLocalStorage();
    } catch (error) {
      console.warn('TranslationService init warning:', error);
    }
  }

  /**
   * Translate texts with caching and cancellation support
   */
  async translate(
    texts: string[],
    context?: string,
    tenantId?: string
  ): Promise<string[]> {
    // Cancel previous request
    this.abort();
    this.abortController = new AbortController();
    
    const signal = this.abortController.signal;
    const targetLang = 'en';
    
    // Check caches for each text
    const results: (string | null)[] = [];
    const toFetch: { index: number; text: string; key: string }[] = [];
    
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      if (!text?.trim()) {
        results[i] = text;
        continue;
      }
      
      const key = this.getCacheKey(text, targetLang, tenantId);
      
      // Check memory cache first (instant)
      const memHit = this.memoryCache.get(key);
      if (memHit) {
        results[i] = memHit;
        continue;
      }
      
      // Check IndexedDB (async but fast)
      try {
        const dbHit = await getItem(key);
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
        
        if (dbHit) {
          this.memoryCache.set(key, dbHit);
          results[i] = dbHit;
          continue;
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') throw error;
        // IndexedDB failed, continue without it
      }
      
      results[i] = null;
      toFetch.push({ index: i, text, key });
    }
    
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    
    // If everything was cached, return immediately
    if (toFetch.length === 0) {
      return results.map((r, i) => r ?? texts[i]);
    }
    
    // Fetch missing translations from API
    const textsToTranslate = toFetch.map(f => f.text);
    
    try {
      const { data, error } = await supabase.functions.invoke('translate-content', {
        body: { texts: textsToTranslate, targetLang, context }
      });
      
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      
      if (error || !data?.translations) {
        console.warn('Translation API error:', error);
        return texts; // Return originals on error
      }
      
      // Store results in caches
      toFetch.forEach((f, idx) => {
        const translated = data.translations[idx] || f.text;
        results[f.index] = translated;
        this.memoryCache.set(f.key, translated);
        this.queueWrite(f.key, translated);
      });
      
      return results.map((r, i) => r ?? texts[i]);
      
    } catch (error) {
      if ((error as Error).name === 'AbortError') throw error;
      console.warn('Translation failed:', error);
      return texts; // Return originals on error
    }
  }

  /**
   * Queue a write to IndexedDB (batched for efficiency)
   */
  private queueWrite(key: string, value: string): void {
    this.writeQueue.set(key, value);
    this.scheduleFlush();
  }

  /**
   * Schedule a flush of the write queue
   */
  private scheduleFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = window.setTimeout(() => this.flush(), 2000);
  }

  /**
   * Flush the write queue to IndexedDB
   */
  private async flush(): Promise<void> {
    this.flushTimer = null;
    if (this.writeQueue.size === 0) return;
    
    const toWrite = new Map(this.writeQueue);
    this.writeQueue.clear();
    
    await setItems(toWrite);
  }

  /**
   * One-time migration from localStorage to IndexedDB
   */
  async migrateFromLocalStorage(): Promise<void> {
    if (this.migrated) return;
    this.migrated = true;
    
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('trans_'));
      if (keys.length === 0) return;
      
      const items = new Map<string, string>();
      for (const key of keys) {
        const value = localStorage.getItem(key);
        if (value) {
          items.set(key, value);
          this.memoryCache.set(key, value);
        }
      }
      
      // Write to IndexedDB
      await setItems(items);
      
      // Clear old localStorage entries
      for (const key of keys) {
        localStorage.removeItem(key);
      }
      
      console.log(`Migrated ${keys.length} translations from localStorage to IndexedDB`);
    } catch (error) {
      console.warn('localStorage migration failed:', error);
    }
  }
}

// Singleton instance
export const translationService = new TranslationService();
