import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminApiService } from './admin-api.service';

@Injectable({ providedIn: 'root' })
export class AdminCollectionsService {
  private adminApi = inject(AdminApiService);

  /**
   * Add items to a single collection
   * @param collectionUuid Collection UUID
   * @param itemUuids Array of item UUIDs to add
   */
  addItemsToCollection(
    collectionUuid: string,
    itemUuids: string[]
  ): Observable<any> {
    return this.adminApi.addItemsToCollection(collectionUuid, itemUuids);
  }

  /**
   * Add items to multiple collections (bulk operation)
   * @param collectionUuids Array of collection UUIDs
   * @param itemUuids Array of item UUIDs to add
   */
  addItemsToCollectionsBulk(
    collectionUuids: string[],
    itemUuids: string[]
  ): Observable<any[]> {
    return this.adminApi.addItemsToCollectionsBulk(collectionUuids, itemUuids);
  }

  /**
   * Remove item from a single collection
   * @param collectionUuid Collection UUID
   * @param itemUuid Item UUID to remove
   */
  removeItemFromCollection(
    collectionUuid: string,
    itemUuid: string
  ): Observable<any> {
    return this.adminApi.removeItemFromCollection(collectionUuid, itemUuid);
  }

  /**
   * Remove multiple items from a single collection (bulk operation)
   * @param collectionUuid Collection UUID
   * @param itemUuids Array of item UUIDs to remove
   */
  removeItemsFromCollectionBulk(
    collectionUuid: string,
    itemUuids: string[]
  ): Observable<any[]> {
    return this.adminApi.removeItemsFromCollectionBulk(collectionUuid, itemUuids);
  }

  /**
   * Remove multiple items from multiple collections (bulk operation)
   * @param collectionUuids Array of collection UUIDs
   * @param itemUuids Array of item UUIDs to remove
   */
  removeItemsFromCollectionsBulk(
    collectionUuids: string[],
    itemUuids: string[]
  ): Observable<any[]> {
    return this.adminApi.removeItemsFromCollectionsBulk(collectionUuids, itemUuids);
  }
}
