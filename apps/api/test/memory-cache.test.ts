import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryCache } from '../src/cache/memory-cache.js';

describe('MemoryCache', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns stored values until they expire', () => {
    const cache = new MemoryCache<number>({ ttlMs: 1000 });
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);

    vi.advanceTimersByTime(1000);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('evicts the oldest entry when maxEntries is exceeded', () => {
    const cache = new MemoryCache<number>({ ttlMs: 1000, maxEntries: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
  });

  it('re-setting a key refreshes its position and expiry', () => {
    const cache = new MemoryCache<number>({ ttlMs: 1000, maxEntries: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('a', 10);
    cache.set('c', 3);
    expect(cache.get('a')).toBe(10);
    expect(cache.get('b')).toBeUndefined();
  });

  it('supports delete and clear', () => {
    const cache = new MemoryCache<number>({ ttlMs: 1000 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.delete('a');
    expect(cache.get('a')).toBeUndefined();
    cache.clear();
    expect(cache.size).toBe(0);
  });
});
