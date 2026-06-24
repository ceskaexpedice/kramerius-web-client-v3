import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Holds the per-document selected CDK member library (a.k.a. `cdk.source`).
 *
 * CDK aggregates many Kramerius libraries. When a document is open, one member
 * library is selected as its source (resolved by `pickCdkCollection()` from
 * `cdk.source` / `cdk.leader` / the `?source=` URL param). Every backend `items/...`
 * call in the reader must carry that code as a path segment so it hits the right
 * library instead of the aggregated endpoint.
 *
 * This service is intentionally dependency-free so any URL builder can inject it
 * without creating circular dependencies (notably `AltoService`, which is itself
 * injected into `IIIFViewerService`).
 */
@Injectable({ providedIn: 'root' })
export class CdkSourceService {

  private code: string | null = null;
  private codeSubject = new BehaviorSubject<string | null>(null);
  public code$: Observable<string | null> = this.codeSubject.asObservable();

  setCode(code: string | null): void {
    const normalized = code || null;
    if (normalized === this.code) return;
    this.code = normalized;
    this.codeSubject.next(normalized);
  }

  getCode(): string | null {
    return this.code;
  }

  /**
   * Builds the trailing portion of an `items/...` URL, prefixed with the selected
   * member library when one is active. Concatenate after `getApiUrl('items')`.
   *
   * e.g. prefixedItemPath('uuid:abc', 'ocr/alto')
   *   → '/knav/uuid:abc/ocr/alto'  (member selected)
   *   → '/uuid:abc/ocr/alto'       (no member selected)
   */
  prefixedItemPath(pid: string, suffix: string): string {
    const prefix = this.code ? `/${this.code}` : '';
    return `${prefix}/${pid}/${suffix}`;
  }
}
