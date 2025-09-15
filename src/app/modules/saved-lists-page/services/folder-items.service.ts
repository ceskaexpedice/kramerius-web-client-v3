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
}