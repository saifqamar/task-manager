interface Entry<T> {
  value: T;
  expiresAt: number;
}

export interface MemoryCacheOptions {
  ttlMs: number;
  /** Oldest entry is evicted once this is exceeded. Defaults to unbounded. */
  maxEntries?: number;
}

/**
 * Minimal per-process TTL cache. Map preserves insertion order, so the first
 * key is always the oldest — that gives cheap FIFO eviction.
 *
 * Limitation: state is local to this process. With more than one API instance,
 * use a shared cache (e.g. Redis) instead.
 */
export class MemoryCache<T> {
  private readonly store = new Map<string, Entry<T>>();

  constructor(private readonly options: MemoryCacheOptions) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.delete(key);
    this.store.set(key, { value, expiresAt: Date.now() + this.options.ttlMs });

    const { maxEntries } = this.options;
    if (maxEntries !== undefined && this.store.size > maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}
