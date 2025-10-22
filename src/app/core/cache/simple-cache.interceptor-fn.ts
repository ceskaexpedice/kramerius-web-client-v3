import { HttpInterceptorFn, HttpResponse, HttpHeaders } from '@angular/common/http';
import { of } from 'rxjs';
import { tap } from 'rxjs/operators';

const TTL = 24 * 60 * 60 * 1000; // 1 day
const CACHE_PREFIX = 'cdk-cache:';
const MAX_CACHE_SIZE = 3 * 1024 * 1024; // 3MB limit (leave room for other app data)
const MAX_ENTRY_SIZE = 100 * 1024; // 100KB per entry limit
const CLEANUP_THRESHOLD = 0.8; // Clean up when cache reaches 80% of limit

// List of URL patterns that should not be cached
const NO_CACHE_PATTERNS = [
  '/folders',           // User folders - always need fresh data
  '/auth',             // Authentication endpoints
  '/user',             // User-specific data
  '/session',           // Session-related endpoints
  '/search'
] as const;

interface CacheEntry {
  response: any; // Serialized HttpResponse
  timestamp: number;
  lastAccessed: number; // For LRU eviction
  status: number;
  statusText: string;
  headers: Record<string, string>;
  compressed?: boolean; // Flag to indicate if response is compressed
}

/**
 * Check if a URL should be cached based on the NO_CACHE_PATTERNS
 */
function shouldCache(url: string): boolean {
  return !NO_CACHE_PATTERNS.some(pattern => url.includes(pattern));
}

/**
 * Simple compression using JSON.stringify with reduced precision
 */
function compressData(data: any): { data: string; compressed: boolean } {
  const jsonString = JSON.stringify(data);

  // If data is small, don't compress
  if (jsonString.length < 5000) {
    return { data: jsonString, compressed: false };
  }

  try {
    // Remove unnecessary whitespace and round numbers to reduce size
    const minified = JSON.stringify(data, (key, value) => {
      if (typeof value === 'number' && !Number.isInteger(value)) {
        return Math.round(value * 100) / 100; // Round to 2 decimal places
      }
      return value;
    });

    return {
      data: minified,
      compressed: minified.length < jsonString.length
    };
  } catch {
    return { data: jsonString, compressed: false };
  }
}

/**
 * Get current cache size in bytes
 */
function getCacheSize(): number {
  let totalSize = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      const value = localStorage.getItem(key);
      if (value) {
        totalSize += key.length + value.length;
      }
    }
  }
  return totalSize;
}

/**
 * Get cache entry size estimate
 */
function getEntrySize(key: string, entry: CacheEntry): number {
  return key.length + JSON.stringify(entry).length;
}

export const simpleCacheInterceptor: HttpInterceptorFn = (req, next) => {
  // Only cache GET requests and URLs that are allowed to be cached
  if (req.method !== 'GET' || !shouldCache(req.url)) {
    return next(req);
  }

  const cacheKey = `${CACHE_PREFIX}${req.method}:${req.urlWithParams}`;

  // Try to get from localStorage
  const cached = getCachedEntry(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < TTL) {
    // Update last accessed time for LRU
    cached.lastAccessed = Date.now();
    setCachedEntry(cacheKey, cached);

    // Handle decompression if needed
    let responseBody = cached.response;
    if (cached.compressed) {
      try {
        responseBody = JSON.parse(cached.response);
      } catch (error) {
        console.warn(`[SimpleCache] Failed to decompress cached data for ${cacheKey}:`, error);
        // Fall through to make fresh request
        return next(req);
      }
    }

    // Recreate HttpResponse from cached data
    const headers = new HttpHeaders(cached.headers);
    const response = new HttpResponse({
      body: responseBody,
      status: cached.status,
      statusText: cached.statusText,
      headers: headers,
      url: req.url
    });
    return of(response);
  }

  // Make the request and cache the response
  return next(req).pipe(
    tap(event => {
      if (event instanceof HttpResponse) {
        // Only store essential headers to reduce cache size
        const essentialHeaders = ['content-type', 'cache-control', 'etag', 'last-modified'];
        const headersObj: Record<string, string> = {};
        essentialHeaders.forEach(header => {
          const value = event.headers.get(header);
          if (value) {
            headersObj[header] = value;
          }
        });

        // Check if entry would be too large
        const entryData = compressData(event.body);
        const estimatedSize = cacheKey.length + JSON.stringify({
          response: entryData.data,
          timestamp: Date.now(),
          lastAccessed: Date.now(),
          status: event.status,
          statusText: event.statusText,
          headers: headersObj,
          compressed: entryData.compressed
        }).length;

        // Skip caching if entry is too large
        if (estimatedSize > MAX_ENTRY_SIZE) {
          console.warn(`[SimpleCache] Entry too large (${estimatedSize} bytes), skipping: ${req.url}`);
          return;
        }

        const cacheEntry: CacheEntry = {
          response: entryData.compressed ? entryData.data : event.body,
          timestamp: Date.now(),
          lastAccessed: Date.now(),
          status: event.status,
          statusText: event.statusText,
          headers: headersObj,
          compressed: entryData.compressed
        };

        // Check if cache is getting full
        const currentSize = getCacheSize();
        if (currentSize > MAX_CACHE_SIZE * CLEANUP_THRESHOLD) {
          performIntelligentCleanup();
        }

        setCachedEntry(cacheKey, cacheEntry);

        // Occasional cleanup of expired entries
        if (Math.random() < 0.05) { // 5% chance (reduced frequency)
          cleanupExpired();
        }
      }
    })
  );
};

function getCachedEntry(key: string): CacheEntry | null {
  try {
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn(`[SimpleCache] Failed to read from localStorage: ${error}`);
    return null;
  }
}

function setCachedEntry(key: string, entry: CacheEntry): void {
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.warn(`[SimpleCache] Failed to write to localStorage: ${error}`);
    // If localStorage is full, try to clean up and retry
    cleanup();
    try {
      localStorage.setItem(key, JSON.stringify(entry));
    } catch (retryError) {
      console.warn(`[SimpleCache] Failed to write to localStorage after cleanup: ${retryError}`);
    }
  }
}

/**
 * Clean up only expired entries
 */
function cleanupExpired(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];

  // Check all cache entries in localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      const entry = getCachedEntry(key);
      if (entry && (now - entry.timestamp) > TTL) {
        keysToDelete.push(key);
      }
    }
  }

  keysToDelete.forEach(key => localStorage.removeItem(key));

  if (keysToDelete.length > 0) {
    console.log(`[SimpleCache] Cleaned up ${keysToDelete.length} expired entries from localStorage`);
  }
}

/**
 * Intelligent cleanup using LRU when cache is getting full
 */
function performIntelligentCleanup(): void {
  const now = Date.now();
  const entries: Array<{ key: string; entry: CacheEntry; lastAccessed: number }> = [];

  // Collect all cache entries with their last accessed time
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      const entry = getCachedEntry(key);
      if (entry) {
        // First remove expired entries
        if ((now - entry.timestamp) > TTL) {
          localStorage.removeItem(key);
          continue;
        }

        entries.push({
          key,
          entry,
          lastAccessed: entry.lastAccessed || entry.timestamp
        });
      }
    }
  }

  // If still over limit, remove oldest accessed entries
  const currentSize = getCacheSize();
  if (currentSize > MAX_CACHE_SIZE * CLEANUP_THRESHOLD) {
    // Sort by last accessed time (oldest first)
    entries.sort((a, b) => a.lastAccessed - b.lastAccessed);

    const targetRemoval = Math.ceil(entries.length * 0.2); // Remove 20% of entries
    const toRemove = entries.slice(0, targetRemoval);

    toRemove.forEach(({ key }) => localStorage.removeItem(key));

    console.log(`[SimpleCache] Intelligent cleanup: removed ${toRemove.length} LRU entries, cache size reduced from ${currentSize} to ${getCacheSize()} bytes`);
  }
}

// Keep the old cleanup function for backward compatibility
function cleanup(): void {
  cleanupExpired();
}

// Export function to clear cache if needed
export function clearSimpleCache(): void {
  const keysToDelete: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach(key => localStorage.removeItem(key));
}

// Export function to clear cache for specific URL pattern
export function clearSimpleCacheForPattern(pattern: string): void {
  const keysToDelete: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX) && key.includes(pattern)) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach(key => localStorage.removeItem(key));

  if (keysToDelete.length > 0) {
    console.log(`[SimpleCache] Cleared ${keysToDelete.length} cache entries matching pattern: ${pattern}`);
  }
}

// Export function to get cache statistics
export function getCacheStats() {
  let totalEntries = 0;
  let totalSize = 0;
  let compressedEntries = 0;
  let expiredEntries = 0;
  const now = Date.now();

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      totalEntries++;
      const value = localStorage.getItem(key);
      if (value) {
        totalSize += key.length + value.length;

        try {
          const entry = JSON.parse(value) as CacheEntry;
          if (entry.compressed) compressedEntries++;
          if ((now - entry.timestamp) > TTL) expiredEntries++;
        } catch {
          // Invalid entry
        }
      }
    }
  }

  return {
    totalEntries,
    totalSize,
    totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    compressedEntries,
    compressionRate: totalEntries > 0 ? ((compressedEntries / totalEntries) * 100).toFixed(1) : '0',
    expiredEntries,
    utilizationPercent: ((totalSize / MAX_CACHE_SIZE) * 100).toFixed(1),
    maxCacheSizeMB: (MAX_CACHE_SIZE / (1024 * 1024)).toFixed(1)
  };
}
