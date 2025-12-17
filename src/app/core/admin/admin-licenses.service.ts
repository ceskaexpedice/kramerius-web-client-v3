import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EnvironmentService } from '../../shared/services/environment.service';
import { AdminApiService, ProcessResponse, ItemLicensesResponse } from './admin-api.service';

export interface AdminLicense {
  name: string;
  description: string;
  id: number;
  priority: number;
  group: 'local' | 'embedded';
}

@Injectable({ providedIn: 'root' })
export class AdminLicensesService {
  private http = inject(HttpClient);
  private env = inject(EnvironmentService);
  private adminApi = inject(AdminApiService);

  private get API_URL(): string {
    return this.env.getBaseApiUrl() + '/search/api/admin/v7.0/licenses';
  }

  /**
   * Get all licenses from admin API
   * @param query Optional search query to filter licenses
   * @param page Page number for pagination
   * @param pageSize Number of items per page
   */
  getLicenses(query?: string, page: number = 0, pageSize: number = 10000): Observable<any> {
    // Admin API doesn't support pagination in the same way as Solr,
    // but we maintain the same interface for consistency
    return this.http.get<AdminLicense[]>(this.API_URL).pipe(
      map(licenses => {
        let filteredLicenses = licenses;

        // Apply frontend filtering if query is provided
        if (query && query.trim()) {
          const searchTerm = query.toLowerCase().trim();
          filteredLicenses = licenses.filter(license =>
            license.name.toLowerCase().includes(searchTerm) ||
            license.description.toLowerCase().includes(searchTerm)
          );
        }

        // Apply pagination
        const startIndex = page * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedLicenses = filteredLicenses.slice(startIndex, endIndex);

        return {
          response: {
            docs: paginatedLicenses,
            numFound: filteredLicenses.length
          }
        };
      })
    );
  }

  /**
   * Get licenses for a specific item
   * @param uuid Item UUID
   */
  getItemLicenses(uuid: string): Observable<ItemLicensesResponse> {
    return this.adminApi.getItemLicenses(uuid);
  }

  /**
   * Add license to a single object
   * @param uuid Object UUID
   * @param licenseName License name
   */
  addLicense(uuid: string, licenseName: string): Observable<ProcessResponse> {
    return this.adminApi.addLicense(uuid, licenseName);
  }

  /**
   * Add license to multiple objects (bulk operation)
   * @param uuids Array of object UUIDs
   * @param licenseName License name
   */
  addLicenseBulk(uuids: string[], licenseName: string): Observable<ProcessResponse[]> {
    return this.adminApi.addLicenseBulk(uuids, licenseName);
  }

  /**
   * Remove license from a single object
   * @param uuid Object UUID
   * @param licenseName License name
   */
  removeLicense(uuid: string, licenseName: string): Observable<ProcessResponse> {
    return this.adminApi.removeLicense(uuid, licenseName);
  }

  /**
   * Remove license from multiple objects (bulk operation)
   * @param uuids Array of object UUIDs
   * @param licenseName License name
   */
  removeLicenseBulk(uuids: string[], licenseName: string): Observable<ProcessResponse[]> {
    return this.adminApi.removeLicenseBulk(uuids, licenseName);
  }
}
