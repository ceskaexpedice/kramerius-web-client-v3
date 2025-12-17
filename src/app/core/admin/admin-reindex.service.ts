import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminApiService, ProcessResponse } from './admin-api.service';

@Injectable({ providedIn: 'root' })
export class AdminReindexService {
  private adminApi = inject(AdminApiService);

  /**
   * Reindex a single object
   * @param uuid Object UUID
   * @param type 'OBJECT' or 'TREE_AND_FOSTER_TREES'
   */
  reindex(
    uuid: string,
    type: 'OBJECT' | 'TREE_AND_FOSTER_TREES' = 'OBJECT'
  ): Observable<ProcessResponse> {
    return this.adminApi.reindex(uuid, type);
  }

  /**
   * Reindex multiple objects (bulk operation)
   * @param uuids Array of object UUIDs
   * @param type 'OBJECT' or 'TREE_AND_FOSTER_TREES'
   */
  reindexBulk(
    uuids: string[],
    type: 'OBJECT' | 'TREE_AND_FOSTER_TREES' = 'OBJECT'
  ): Observable<ProcessResponse[]> {
    return this.adminApi.reindexBulk(uuids, type);
  }
}
