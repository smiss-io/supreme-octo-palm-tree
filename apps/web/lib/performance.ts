// Performance optimization utilities
// Caching, debounce, and lazy-load helpers

/**
 * In-memory LRU cache with TTL for server-side use
 * Used for caching expensive DB aggregations (e.g., reporting queries)
 */
export class ServerCache<T> {
  private cache = new Map<string, { value: T; expiresAt: number }>()
  private readonly maxSize: number
  private readonly defaultTtlMs: number

  constructor(maxSize = 100, defaultTtlMs = 60_000) {
    this.maxSize = maxSize
    this.defaultTtlMs = defaultTtlMs
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return undefined
    }
    // Move to end (most recently used)
    this.cache.delete(key)
    this.cache.set(key, entry)
    return entry.value
  }

  set(key: string, value: T, ttlMs?: number): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey !== undefined) this.cache.delete(oldestKey)
    }
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
    })
  }

  invalidate(key: string): boolean {
    return this.cache.delete(key)
  }

  invalidatePrefix(prefix: string): number {
    let count = 0
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
        count++
      }
    }
    return count
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delayMs)
  }
}

/**
 * Build cache key for reporting queries
 * Ensures consistent key format across all report types
 */
export function buildReportCacheKey(
  orgId: string,
  reportType: string,
  dateFrom: string,
  dateTo: string
): string {
  return `report:${orgId}:${reportType}:${dateFrom}:${dateTo}`
}

// Shared cache instances for server-side reporting
export const reportCache = new ServerCache<unknown>(50, 5 * 60_000) // 5 min TTL
export const forecastCache = new ServerCache<unknown>(20, 15 * 60_000) // 15 min TTL
