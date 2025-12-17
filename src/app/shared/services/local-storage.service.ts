import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  constructor() { }

  // Save data to localStorage
  set<T>(key: string, value: T): void {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (error) {
      console.error(`Failed to save ${key} to localStorage`, error);
    }
  }

  // Get data from localStorage
  get<T>(key: string): T | null {
    const item = localStorage.getItem(key);
    if (!item) {
      return null;
    }

    try {
      return JSON.parse(item) as T;
    } catch (error) {
      return item as unknown as T;
    }
  }

  // Remove item by key
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove ${key} from localStorage`, error);
    }
  }

  // Clear all localStorage data
  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear localStorage', error);
    }
  }

  // Check if key exists
  has(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }
}
