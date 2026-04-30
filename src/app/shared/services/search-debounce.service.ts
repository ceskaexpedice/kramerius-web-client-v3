import { Injectable } from '@angular/core';

/**
 * Centralized service for managing search debouncing logic.
 * Eliminates code duplication across PDF, EPUB, and other sidebar components.
 */
@Injectable({
  providedIn: 'root'
})
export class SearchDebounceService {
  private debounceTimeouts: Map<string, any> = new Map();

  /**
   * Execute a search operation with debouncing (default 500ms).
   * Clears any previous timeout for the same key before scheduling a new one.
   * 
   * @param key - Unique identifier for this debounce context (e.g., 'pdf-search', 'epub-search')
   * @param callback - Function to execute after debounce period
   * @param delayMs - Debounce delay in milliseconds (default: 500)
   */
  public debounce(key: string, callback: () => void, delayMs: number = 500): void {
    const existingTimeout = this.debounceTimeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const newTimeout = setTimeout(() => {
      callback();
      this.debounceTimeouts.delete(key);
    }, delayMs);

    this.debounceTimeouts.set(key, newTimeout);
  }

  /**
   * Immediately execute and clear any pending debounce for the given key.
   */
  public cancel(key: string): void {
    const timeout = this.debounceTimeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.debounceTimeouts.delete(key);
    }
  }

  /**
   * Clear all pending debounce timeouts.
   */
  public clearAll(): void {
    this.debounceTimeouts.forEach(timeout => clearTimeout(timeout));
    this.debounceTimeouts.clear();
  }
}
