import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { EnvironmentService } from '../../../shared/services/environment.service';
import { SearchResultResponse } from '../../models/search-result-response';

/**
 * Folder-specific scope layer for the saved-lists search. Resolves saved item
 * ids to each item's own_pid_path (the old client scopes the folder search with
 * `pid_paths:<own_pid_path>*`, i.e. each saved item's own subtree — NOT the whole
 * root tree), and merges the per-chunk Solr responses produced when the caller
 * chunks large folders. This is the ONLY folder-specific search logic — the
 * actual query/facet/parse work is the shared SolrService path.
 */
@Injectable({ providedIn: 'root' })
export class FolderSearchScope {
  private http = inject(HttpClient);
  private environmentService = inject(EnvironmentService);

  /** Max scope paths per scoped request, keeping the GET URL under the server limit. */
  static readonly PID_BATCH_SIZE = 50;

  /** Splits an array into consecutive chunks of at most `size`. */
  chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Resolves saved item ids to each item's own_pid_path (the full path from the
   * root down to the item), so a folder search covers exactly each item's own
   * subtree — same as the old client's `buildFolderItemsPathsQuery`. Uses the
   * doc's pid when own_pid_path is absent. Batched into PID_BATCH_SIZE.
   */
  resolveScopePaths(itemIds: string[]): Observable<string[]> {
    if (itemIds.length === 0) {
      return of([]);
    }
    const searchUrl = this.environmentService.getApiUrl('search') || '';
    const lookups = this.chunk(itemIds, FolderSearchScope.PID_BATCH_SIZE).map(chunkIds => {
      const pidQuery = chunkIds.map(id => `pid:"${id}"`).join(' OR ');
      const params = new HttpParams()
        .set('q', `(${pidQuery})`)
        .set('fl', 'pid,own_pid_path')
        .set('rows', `${chunkIds.length}`)
        .set('wt', 'json');
      return this.http.get<any>(searchUrl, { params });
    });

    return forkJoin(lookups).pipe(
      map(responses => {
        const paths = new Set<string>();
        for (const response of responses) {
          for (const doc of response?.response?.docs ?? []) {
            paths.add(doc['own_pid_path'] || doc.pid);
          }
        }
        return Array.from(paths);
      })
    );
  }

  /**
   * Merges per-chunk Solr responses into one response of the same shape. Scope
   * paths are distinct across chunks, so this is a plain sum/concat: numFound and
   * grouped ngroups sum; docs and grouped groups concat; facet_fields (flat
   * [name,count,...]) and facet_queries counts sum. (If one saved item is nested
   * under another AND they land in different chunks, its subtree double-counts —
   * within one chunk Solr dedupes naturally, matching the old client's single request.)
   */
  mergeResponses(responses: SearchResultResponse[]): SearchResultResponse {
    const docs: any[] = [];
    let numFound = 0;
    let ngroups = 0;
    const groups: any[] = [];
    let hasGrouped = false;
    const facetFieldCounts: Record<string, Map<string, number>> = {};
    const facetQueryCounts: Record<string, number> = {};

    for (const response of responses as any[]) {
      docs.push(...(response?.response?.docs ?? []));
      numFound += response?.response?.numFound ?? 0;

      const groupedField = response?.grouped?.['root.pid'];
      if (groupedField) {
        hasGrouped = true;
        ngroups += groupedField.ngroups ?? 0;
        groups.push(...(groupedField.groups ?? []));
      }

      const facetFields = response?.facet_counts?.facet_fields ?? {};
      for (const [field, flat] of Object.entries<any[]>(facetFields)) {
        const counts = facetFieldCounts[field] ??= new Map<string, number>();
        for (let i = 0; i + 1 < flat.length; i += 2) {
          counts.set(flat[i], (counts.get(flat[i]) ?? 0) + (flat[i + 1] ?? 0));
        }
      }

      const facetQueries = response?.facet_counts?.facet_queries ?? {};
      for (const [queryStr, count] of Object.entries<number>(facetQueries)) {
        facetQueryCounts[queryStr] = (facetQueryCounts[queryStr] ?? 0) + count;
      }
    }

    const mergedFacetFields: Record<string, any[]> = {};
    for (const [field, counts] of Object.entries(facetFieldCounts)) {
      const flat: any[] = [];
      counts.forEach((count, name) => flat.push(name, count));
      mergedFacetFields[field] = flat;
    }

    const merged: any = {
      response: { docs, numFound },
      facet_counts: { facet_fields: mergedFacetFields, facet_queries: facetQueryCounts },
    };
    if (hasGrouped) {
      merged.grouped = { 'root.pid': { ngroups, groups } };
    }
    return merged as SearchResultResponse;
  }
}
