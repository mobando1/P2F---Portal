class StripeCache {
  private cache = new Map<string, { data: any; expiresAt: number }>();

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: any, ttlMs: number): void {
    this.cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }
}

export const stripeCache = new StripeCache();

// TTL constants in milliseconds
export const CACHE_TTL = {
  MRR: 5 * 60 * 1000,          // 5 minutes
  TRANSACTIONS: 2 * 60 * 1000,  // 2 minutes
  STUDENT_STRIPE: 3 * 60 * 1000, // 3 minutes
};
