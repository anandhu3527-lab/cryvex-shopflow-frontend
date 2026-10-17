/**
 * queryCache.js
 * A lightweight in-memory TTL cache shared across the session.
 * Prevents duplicate API calls when navigating between pages.
 *
 * Usage:
 *   import { queryCache } from './queryCache';
 *   const data = await queryCache.fetch('key', () => api.getData(), 60_000);
 *   queryCache.invalidate('key');
 *   queryCache.invalidatePrefix('bills');
 */

const cache = new Map();

export const queryCache = {
  /**
   * Fetch from cache if fresh, otherwise call fetcher and cache result.
   * @param {string} key - Cache key
   * @param {() => Promise<any>} fetcher - Async function that returns data
   * @param {number} ttlMs - Time-to-live in milliseconds (default: 60 seconds)
   */
  async fetch(key, fetcher, ttlMs = 60_000) {
    const entry = cache.get(key);
    if (entry && Date.now() - entry.timestamp < ttlMs) {
      return entry.data;
    }
    const data = await fetcher();
    cache.set(key, { data, timestamp: Date.now() });
    return data;
  },

  /** Manually set a value into cache. */
  set(key, data) {
    cache.set(key, { data, timestamp: Date.now() });
  },

  /** Invalidate a specific cache key. */
  invalidate(key) {
    cache.delete(key);
  },

  /** Invalidate all keys that start with a given prefix. */
  invalidatePrefix(prefix) {
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) {
        cache.delete(key);
      }
    }
  },

  /** Clear the entire cache (e.g., on logout). */
  clear() {
    cache.clear();
  },

  /** Get cached value without fetching. */
  get(key) {
    const entry = cache.get(key);
    return entry ? entry.data : undefined;
  },

  /** Check if a key has a fresh entry. */
  isFresh(key, ttlMs = 60_000) {
    const entry = cache.get(key);
    return Boolean(entry && Date.now() - entry.timestamp < ttlMs);
  },
};

export default queryCache;
