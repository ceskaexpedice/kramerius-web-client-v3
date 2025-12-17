import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { EnvironmentService } from '../../shared/services/environment.service';

export interface ProcessParams {
  defid: string;
  params: Record<string, any>;
}

export interface ProcessResponse {
  uuid: string;
  state: string;
  // Add other relevant fields as needed
}

export interface ItemLicensesResponse {
  licenses: string[];
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private http = inject(HttpClient);
  private env = inject(EnvironmentService);

  private get BASE_URL(): string {
    return this.env.getBaseApiUrl() + '/search/api/admin/v7.0';
  }

  // ==========================================
  // PROCESS-BASED OPERATIONS (Async jobs)
  // ==========================================

  /**
   * Change accessibility policy for an object
   * @param uuid Object UUID
   * @param scope 'OBJECT' or 'TREE'
   * @param policy 'PUBLIC' or 'PRIVATE'
   */
  changeAccessibility(
    uuid: string,
    scope: 'OBJECT' | 'TREE',
    policy: 'PUBLIC' | 'PRIVATE'
  ): Observable<ProcessResponse> {
    const body: ProcessParams = {
      defid: 'set_policy',
      params: {
        scope,
        policy,
        pid: uuid
      }
    };
    return this.http.post<ProcessResponse>(`${this.BASE_URL}/processes/`, body);
  }

  /**
   * Reindex an object
   * @param uuid Object UUID
   * @param type 'OBJECT' or 'TREE_AND_FOSTER_TREES'
   */
  reindex(
    uuid: string,
    type: 'OBJECT' | 'TREE_AND_FOSTER_TREES'
  ): Observable<ProcessResponse> {
    const body: ProcessParams = {
      defid: 'new_indexer_index_object',
      params: {
        type,
        pid: uuid,
        ignoreInconsistentObjects: true
      }
    };
    return this.http.post<ProcessResponse>(`${this.BASE_URL}/processes/`, body);
  }

  /**
   * Add license to an object
   * @param uuid Object UUID
   * @param licenseName License name
   */
  addLicense(uuid: string, licenseName: string): Observable<ProcessResponse> {
    const body: ProcessParams = {
      defid: 'add_license',
      params: {
        license: licenseName,
        pid: uuid
      }
    };
    return this.http.post<ProcessResponse>(`${this.BASE_URL}/processes/`, body);
  }

  /**
   * Remove license from an object
   * @param uuid Object UUID
   * @param licenseName License name
   */
  removeLicense(uuid: string, licenseName: string): Observable<ProcessResponse> {
    const body: ProcessParams = {
      defid: 'remove_license',
      params: {
        license: licenseName,
        pid: uuid
      }
    };
    return this.http.post<ProcessResponse>(`${this.BASE_URL}/processes/`, body);
  }

  // ==========================================
  // BULK OPERATIONS WITH RECURSIVE PATTERN
  // ==========================================

  /**
   * Change accessibility for multiple objects (bulk operation)
   * @param uuids Array of object UUIDs
   * @param scope 'OBJECT' or 'TREE'
   * @param policy 'PUBLIC' or 'PRIVATE'
   */
  changeAccessibilityBulk(
    uuids: string[],
    scope: 'OBJECT' | 'TREE',
    policy: 'PUBLIC' | 'PRIVATE'
  ): Observable<ProcessResponse[]> {
    return this.executeBulkOperation(
      uuids,
      (uuid) => this.changeAccessibility(uuid, scope, policy)
    );
  }

  /**
   * Reindex multiple objects (bulk operation)
   * @param uuids Array of object UUIDs
   * @param type 'OBJECT' or 'TREE_AND_FOSTER_TREES'
   */
  reindexBulk(
    uuids: string[],
    type: 'OBJECT' | 'TREE_AND_FOSTER_TREES'
  ): Observable<ProcessResponse[]> {
    return this.executeBulkOperation(
      uuids,
      (uuid) => this.reindex(uuid, type)
    );
  }

  /**
   * Add license to multiple objects (bulk operation)
   * @param uuids Array of object UUIDs
   * @param licenseName License name
   */
  addLicenseBulk(uuids: string[], licenseName: string): Observable<ProcessResponse[]> {
    return this.executeBulkOperation(
      uuids,
      (uuid) => this.addLicense(uuid, licenseName)
    );
  }

  /**
   * Remove license from multiple objects (bulk operation)
   * @param uuids Array of object UUIDs
   * @param licenseName License name
   */
  removeLicenseBulk(uuids: string[], licenseName: string): Observable<ProcessResponse[]> {
    return this.executeBulkOperation(
      uuids,
      (uuid) => this.removeLicense(uuid, licenseName)
    );
  }

  // ==========================================
  // COLLECTION OPERATIONS
  // ==========================================

  /**
   * Add items to a collection
   * @param collectionUuid Collection UUID
   * @param itemUuids Array of item UUIDs to add
   */
  addItemsToCollection(
    collectionUuid: string,
    itemUuids: string[]
  ): Observable<any> {
    return this.http.post(
      `${this.BASE_URL}/collections/${collectionUuid}/items`,
      itemUuids
    );
  }

  /**
   * Remove item from collection
   * @param collectionUuid Collection UUID
   * @param itemUuid Item UUID to remove
   */
  removeItemFromCollection(
    collectionUuid: string,
    itemUuid: string
  ): Observable<any> {
    return this.http.delete(
      `${this.BASE_URL}/collections/${collectionUuid}/items/${itemUuid}`
    );
  }

  /**
   * Remove multiple items from collection (bulk operation)
   * @param collectionUuid Collection UUID
   * @param itemUuids Array of item UUIDs to remove
   */
  removeItemsFromCollectionBulk(
    collectionUuid: string,
    itemUuids: string[]
  ): Observable<any[]> {
    return this.executeBulkOperation(
      itemUuids,
      (uuid) => this.removeItemFromCollection(collectionUuid, uuid)
    );
  }

  /**
   * Add multiple items to multiple collections (bulk operation)
   * @param collectionUuids Array of collection UUIDs
   * @param itemUuids Array of item UUIDs to add
   */
  addItemsToCollectionsBulk(
    collectionUuids: string[],
    itemUuids: string[]
  ): Observable<any[]> {
    return this.executeBulkOperation(
      collectionUuids,
      (collectionUuid) => this.addItemsToCollection(collectionUuid, itemUuids)
    );
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
    const operations = collectionUuids.flatMap(collectionUuid =>
      itemUuids.map(itemUuid =>
        this.removeItemFromCollection(collectionUuid, itemUuid)
      )
    );
    return forkJoin(operations);
  }

  // ==========================================
  // ITEM LICENSE OPERATIONS
  // ==========================================

  /**
   * Get licenses for a specific item
   * @param uuid Item UUID
   */
  getItemLicenses(uuid: string): Observable<ItemLicensesResponse> {
    return this.http.get<ItemLicensesResponse>(
      `${this.BASE_URL}/items/${uuid}/licenses`
    );
  }

  // ==========================================
  // REPRESENTATIVE PAGE OPERATIONS
  // ==========================================

  /**
   * Set representative page for an object
   * @param forObjectUuid Object UUID to set representative page for
   * @param fromPageUuid Page UUID to use as representative
   */
  setRepresentativePage(
    forObjectUuid: string,
    fromPageUuid: string
  ): Observable<any> {
    return this.http.put(
      `${this.BASE_URL}/items/${forObjectUuid}/streams/IMG_THUMB?srcPid=${fromPageUuid}`,
      {}
    );
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  /**
   * Generic bulk operation executor using recursive pattern
   * @param items Array of items to process
   * @param operation Function that takes an item and returns an Observable
   */
  private executeBulkOperation<T, R>(
    items: T[],
    operation: (item: T) => Observable<R>
  ): Observable<R[]> {
    if (items.length === 0) {
      return of([]);
    }

    // Execute operations sequentially to avoid overwhelming the server
    return this.executeSequentially(items, operation);
  }

  /**
   * Execute operations sequentially (one after another)
   * @param items Array of items to process
   * @param operation Function that takes an item and returns an Observable
   */
  private executeSequentially<T, R>(
    items: T[],
    operation: (item: T) => Observable<R>,
    index: number = 0,
    results: R[] = []
  ): Observable<R[]> {
    if (index >= items.length) {
      return of(results);
    }

    return operation(items[index]).pipe(
      switchMap(result => {
        results.push(result);
        return this.executeSequentially(items, operation, index + 1, results);
      }),
      catchError(error => {
        console.error(`Error processing item at index ${index}:`, error);
        // Continue with next item even if this one fails
        return this.executeSequentially(items, operation, index + 1, results);
      })
    );
  }
}
