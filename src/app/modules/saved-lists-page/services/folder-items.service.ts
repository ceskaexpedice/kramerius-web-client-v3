import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, combineLatest, distinctUntilChanged, map } from 'rxjs';
import * as FoldersSelectors from '../state/folders.selectors';
import { AuthService } from '../../../core/auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class FolderItemsService {

  private store = inject(Store);
  private authService = inject(AuthService);

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
   * IDs of the user's OWN folders that contain the item. Followed/shared
   * folders aren't editable, so they're left out — this is what decides whether
   * the "remove from my library" action is offered at all.
   */
  getOwnedFolderIdsContainingItem(itemId: string): Observable<string[]> {
    return combineLatest([
      this.getFolderIdsContainingItem(itemId),
      this.store.select(FoldersSelectors.selectUserOwnedFolders)
    ]).pipe(
      map(([folderIds, ownedFolders]) => {
        const ownedIds = new Set(ownedFolders.map(f => f.uuid));
        return folderIds.filter(id => ownedIds.has(id));
      }),
      distinctUntilChanged((a, b) => a.length === b.length && a.every((id, i) => id === b[i]))
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
    const owner = this.currentOwner();
    if (!owner) return;
    try {
      const cacheData = {
        owner,
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

      // Drop the cache when it is expired (24h TTL) or belongs to another user,
      // e.g. a shared computer where the previous user did not log out.
      const owner = this.currentOwner();
      if (!owner || parsed.owner !== owner || !parsed.savedAt || (now - parsed.savedAt) > this.CACHE_TTL) {
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

  /**
   * Identifies the signed-in user by the `sub` claim of the access token, so the
   * cache is never served to a different account. Returns null when unknown,
   * which disables the cache rather than risking another user's data.
   */
  private currentOwner(): string | null {
    const token = this.authService.getStoredTokens()?.accessToken;
    const payload = token?.split('.')[1];
    if (!payload) return null;
    try {
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      const sub = JSON.parse(json)?.sub;
      return typeof sub === 'string' && sub ? sub : null;
    } catch {
      return null;
    }
  }
}
