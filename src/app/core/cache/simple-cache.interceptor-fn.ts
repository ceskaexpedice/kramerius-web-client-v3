import { HttpInterceptorFn, HttpResponse, HttpHeaders } from '@angular/common/http';
import { of } from 'rxjs';
import { tap } from 'rxjs/operators';

const TTL = 24 * 60 * 60 * 1000; // 1 day
const CACHE_PREFIX = 'cdk-cache:';

// List of URL patterns that should not be cached
const NO_CACHE_PATTERNS = [
  '/folders',           // User folders - always need fresh data
  '/auth',             // Authentication endpoints
  '/user',             // User-specific data
  '/session',           // Session-related endpoints
] as const;

interface CacheEntry {
  response: any; // Serialized HttpResponse
  timestamp: number;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

/**
 * Check if a URL should be cached based on the NO_CACHE_PATTERNS
 */
function shouldCache(url: string): boolean {
  return !NO_CACHE_PATTERNS.some(pattern => url.includes(pattern));
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
    // Recreate HttpResponse from cached data
    const headers = new HttpHeaders(cached.headers);
    const response = new HttpResponse({
      body: cached.response,
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
        // Convert headers to plain object for serialization
        const headersObj: Record<string, string> = {};
        event.headers.keys().forEach(key => {
          headersObj[key] = event.headers.get(key) || '';
        });

        const cacheEntry: CacheEntry = {
          response: event.body,
          timestamp: Date.now(),
          status: event.status,
          statusText: event.statusText,
          headers: headersObj
        };

        setCachedEntry(cacheKey, cacheEntry);

        // Clean up old entries occasionally
        if (Math.random() < 0.1) { // 10% chance
          cleanup();
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

function cleanup(): void {
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
