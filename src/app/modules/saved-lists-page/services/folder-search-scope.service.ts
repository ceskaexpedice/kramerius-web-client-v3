import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpUrlEncodingCodec } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { EnvironmentService } from '../../../shared/services/environment.service';
import { SolrService } from '../../../core/solr/solr.service';
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

  /**
   * Ids per own_pid_path lookup request (`pid:"..."` terms + a short `fl`). That
   * request carries nothing else, so a count cap is enough to keep it small.
   */
  static readonly PID_BATCH_SIZE = 25;

  /**
   * Max URL-encoded length of the pid scope clause in one scoped request.
   *
   * The API's Tomcat rejects a request with HTTP 400 (no CORS headers, so the
   * browser sees status 0) once the request line plus ALL headers exceed ~8 KB.
   * For a logged-in user the `Authorization: Bearer` header alone is ~2.2 KB,
   * the browser's own headers ~1 KB, and the non-scope part of the query string
   * (facet fields, license facet queries, fl, fq) ~2–2.5 KB. That leaves roughly
   * 2.3 KB for the scope; 1800 keeps headroom for extra `fq` from active filters.
   *
   * Sized by length, not item count: a four-level own_pid_path term is ~4x a
   * single-uuid one, so a fixed count (25) still produced a ~7 KB URL that broke
   * the "Genealogie" folder search (56 items, query=hlas) for logged-in users.
   */
  static readonly SCOPE_QUERY_BUDGET = 1800;

  private static readonly codec = new HttpUrlEncodingCodec();
  private static readonly OR_LENGTH = FolderSearchScope.codec.encodeValue(' OR ').length;

  /** Splits an array into consecutive chunks of at most `size`. */
  chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Splits scope ids into consecutive chunks whose encoded scope clause (as
   * SolrService builds it: `(term OR term ...)`) stays within `budget`. An id
   * whose term alone exceeds the budget still gets its own chunk — never dropped.
   */
  chunkScope(ids: string[], exact = false, budget = FolderSearchScope.SCOPE_QUERY_BUDGET): string[][] {
    const chunks: string[][] = [];
    let current: string[] = [];
    let length = 2; // the wrapping parentheses
    for (const id of ids) {
      const termLength = FolderSearchScope.codec.encodeValue(SolrService.pidScopeTerm(id, exact)).length;
      const added = current.length === 0 ? termLength : FolderSearchScope.OR_LENGTH + termLength;
      if (current.length > 0 && length + added > budget) {
        chunks.push(current);
        current = [];
        length = 2 + termLength;
      } else {
        length += added;
      }
      current.push(id);
    }
    if (current.length > 0) {
      chunks.push(current);
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
   * Returns `base` with its `field` facet counts taken from `source`. Solr may
   * echo the field under its local-params key (`{!ex=model}model`), so every
   * variant of the field is dropped from `base` and the source's counts are
   * stored under the plain field name.
   */
  replaceFacetField(base: SearchResultResponse, source: SearchResultResponse, field: string): SearchResultResponse {
    const matches = (key: string) => key === field || (key.startsWith('{!') && key.endsWith(`}${field}`));
    const sourceFields = (source as any)?.facet_counts?.facet_fields ?? {};
    const sourceKey = Object.keys(sourceFields).find(matches);
    if (!sourceKey) {
      return base;
    }
    const baseFields = (base as any)?.facet_counts?.facet_fields ?? {};
    const facetFields: Record<string, any[]> = {};
    for (const [key, value] of Object.entries<any[]>(baseFields)) {
      if (!matches(key)) facetFields[key] = value;
    }
    facetFields[field] = sourceFields[sourceKey];
    return {
      ...base,
      facet_counts: { ...(base as any).facet_counts, facet_fields: facetFields },
    } as SearchResultResponse;
  }

  /**
   * Merges per-chunk Solr responses into one response of the same shape. Scope
   * paths are distinct across chunks, so this is a plain sum/concat: numFound and
   * grouped ngroups sum; docs and grouped groups concat; facet_fields (flat
   * [name,count,...]) and facet_queries counts sum; highlighting (keyed by doc
   * pid — the OCR snippets shown on page cards) is combined key by key. (If one saved item is nested
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
    const highlighting: Record<string, any> = {};

    for (const response of responses as any[]) {
      docs.push(...(response?.response?.docs ?? []));
      Object.assign(highlighting, response?.highlighting ?? {});
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
    if (Object.keys(highlighting).length > 0) {
      merged.highlighting = highlighting;
    }
    return merged as SearchResultResponse;
  }
}
