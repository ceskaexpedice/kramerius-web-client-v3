import { HttpClient, HttpContext, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, Observable, Subscription, catchError, defer, filter, of, shareReplay, take, timeout } from 'rxjs';
import { SKIP_ERROR_INTERCEPTOR } from '../../core/services/http-context-tokens';
import { IIIFViewerService } from './iiif-viewer.service';
import { CdkSourceService } from './cdk-source.service';

/** A prefetch older than this is not used (auth or source may have changed). */
const MAX_AGE_MS = 30_000;
/** How long a prefetch waits for the member library (source) to be resolved. */
const SOURCE_WAIT_MS = 5_000;

/**
 * Starts a page's IIIF info.json request while its access check
 * (`items/<pid>/info`) is still running, so the viewer does not wait for the
 * two round trips one after the other. The access check still gates the
 * viewer exactly as before; only the network request starts earlier.
 *
 * Single entry, handed out once: the viewer takes it for the same URL, else
 * (or on error, e.g. a locked page not yet unlocked) it makes its own request.
 */
@Injectable({ providedIn: 'root' })
export class IiifInfoPrefetchService {
  private http = inject(HttpClient);
  private iiifViewerService = inject(IIIFViewerService);
  private cdkSource = inject(CdkSourceService);

  private entry: { url: string; at: number; response$: Observable<unknown> } | null = null;
  private waiting: Subscription | null = null;

  /**
   * @param waitForSource the document comes from several member libraries: the
   *   info.json URL carries the selected one (`/iiif/<code>/…`), which the
   *   metadata sidebar resolves a moment later. Wait for it (bounded) rather than
   *   prefetch a URL the viewer will not use. With a source already selected
   *   (page turns) the request starts at once.
   */
  prefetch(pid: string, waitForSource = false): void {
    this.waiting?.unsubscribe();
    const ready$ = waitForSource && !this.cdkSource.getCode()
      ? this.cdkSource.code$.pipe(
          filter(code => !!code),
          take(1),
          timeout({ first: SOURCE_WAIT_MS, with: () => EMPTY }),
        )
      : of(null);
    this.waiting = ready$.subscribe(() => this.start(pid));
  }

  private start(pid: string): void {
    const url = this.iiifViewerService.getIIIFInfoUrl(pid);
    if (this.entry?.url === url && Date.now() - this.entry.at < MAX_AGE_MS) return;

    const response$ = this.request(url).pipe(shareReplay({ bufferSize: 1, refCount: false }));
    // Start now; an error is handled by whoever takes it (falls back to a fresh request).
    response$.subscribe({ error: () => undefined });
    this.entry = { url, at: Date.now(), response$ };
  }

  /**
   * info.json for `url`: the prefetched response when one matches (used once),
   * otherwise — or when the prefetch failed — a fresh request.
   */
  get(url: string): Observable<any> {
    const entry = this.entry;
    const fresh$ = defer(() => this.request(url));
    // The viewer is asking now: a prefetch still waiting for the source would
    // only duplicate this request.
    this.waiting?.unsubscribe();
    this.waiting = null;
    if (!entry || entry.url !== url || Date.now() - entry.at >= MAX_AGE_MS) {
      return fresh$;
    }
    this.entry = null;
    return entry.response$.pipe(catchError(() => fresh$));
  }

  private request(url: string): Observable<unknown> {
    const authHeaders = this.iiifViewerService.getAuthHeaders();
    let headers = new HttpHeaders();
    if (authHeaders['Authorization']) {
      headers = headers.set('Authorization', authHeaders['Authorization']);
    }
    return this.http.get(url, {
      headers,
      context: new HttpContext().set(SKIP_ERROR_INTERCEPTOR, true),
    });
  }
}
