import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, map } from 'rxjs';
import * as FoldersSelectors from '../state/folders.selectors';

@Injectable({
  providedIn: 'root'
})
export class FolderItemsService {
  
  private store = inject(Store);

  /**
   * Check if an item exists in any folder
   */
  isItemInAnyFolder(itemId: string): Observable<boolean> {
    return this.store.select(FoldersSelectors.selectFolderItemsMapping).pipe(
      map(folderItemsMapping => {
        if (!folderItemsMapping) return false;
        
        // Check if item exists in any folder
        for (const [, itemsSet] of folderItemsMapping.entries()) {
          if (itemsSet.has(itemId)) {
            return true;
          }
        }
        return false;
      })
    );
  }

  /**
   * Get all folder IDs that contain a specific item
   */
  getFolderIdsContainingItem(itemId: string): Observable<string[]> {
    return this.store.select(FoldersSelectors.selectFolderItemsMapping).pipe(
      map(folderItemsMapping => {
        if (!folderItemsMapping) return [];
        
        const folderIds: string[] = [];
        for (const [folderId, itemsSet] of folderItemsMapping.entries()) {
          if (itemsSet.has(itemId)) {
            folderIds.push(folderId);
          }
        }
        return folderIds;
      })
    );
  }

  /**
   * Check if an item exists in a specific folder
   */
  isItemInFolder(itemId: string, folderId: string): Observable<boolean> {
    return this.store.select(FoldersSelectors.selectFolderItemsMapping).pipe(
      map(folderItemsMapping => {
        if (!folderItemsMapping) return false;
        
        const itemsSet = folderItemsMapping.get(folderId);
        return itemsSet ? itemsSet.has(itemId) : false;
      })
    );
  }

  /**
   * Get the count of folders containing a specific item
   */
  getFolderCountForItem(itemId: string): Observable<number> {
    return this.getFolderIdsContainingItem(itemId).pipe(
      map(folderIds => folderIds.length)
    );
  }

  // Cache management methods
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly STORAGE_KEY = 'cdk-folder-items-cache';

  saveCacheToStorage(itemsMapping: Map<string, Set<string>>): void {
    try {
      const cacheData = {
        itemsMapping: Array.from(itemsMapping.entries()).map(([key, set]) => [key, Array.from(set)]),
        savedAt: Date.now()
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('[FolderItemsService] Failed to save cache to localStorage:', error);
    }
  }

  loadCacheFromStorage(): Map<string, Set<string>> | null {
    try {
      const cachedData = localStorage.getItem(this.STORAGE_KEY);
      if (!cachedData) {
        return null;
      }

      const parsed = JSON.parse(cachedData);
      const now = Date.now();
      
      // Check if cache is expired (24h TTL)
      if (!parsed.savedAt || (now - parsed.savedAt) > this.CACHE_TTL) {
        localStorage.removeItem(this.STORAGE_KEY);
        return null;
      }

      // Convert back to Map<string, Set<string>>
      const itemsMapping = new Map<string, Set<string>>();
      parsed.itemsMapping.forEach(([key, array]: [string, string[]]) => {
        itemsMapping.set(key, new Set(array));
      });

      return itemsMapping;
    } catch (error) {
      console.warn('[FolderItemsService] Failed to load cache from localStorage:', error);
      localStorage.removeItem(this.STORAGE_KEY);
      return null;
    }
  }
}