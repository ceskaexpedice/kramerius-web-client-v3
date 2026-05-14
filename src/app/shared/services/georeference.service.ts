import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ConfigService } from '../../core/config/config.service';
import { SKIP_ERROR_INTERCEPTOR } from '../../core/services/http-context-tokens';

@Injectable({ providedIn: 'root' })
export class GeoreferenceService {

  private http = inject(HttpClient);
  private configService = inject(ConfigService);

  private hasGeoreferenceSubject = new BehaviorSubject<boolean>(false);
  public hasGeoreference$ = this.hasGeoreferenceSubject.asObservable();

  private cache = new Map<string, any>();
  private currentPid: string | null = null;

  /**
   * Whether the georeference feature is enabled and configured for this deployment.
   * Returns false if either `features.georef` is off OR `api.georefUrl` is missing.
   */
  isEnabled(): boolean {
    return this.configService.isFeatureEnabled('georef') && !!this.getApiBase();
  }

  getAnnotationUrl(pid: string): string {
    return `${this.getApiBase()}/${pid}`;
  }

  /**
   * Probe whether the given page PID has a georeference annotation.
   * Updates hasGeoreference$ for the latest requested PID only (avoids
   * stale responses overwriting state when the user pages quickly).
   *
   * No-op when the feature is disabled.
   */
  checkPid(pid: string | null): void {
    this.currentPid = pid;

    if (!this.isEnabled() || !pid) {
      this.hasGeoreferenceSubject.next(false);
      return;
    }

    if (this.cache.has(pid)) {
      this.hasGeoreferenceSubject.next(this.cache.get(pid) !== null);
      return;
    }

    this.fetchAnnotation(pid).subscribe(annotation => {
      this.cache.set(pid, annotation);
      if (this.currentPid === pid) {
        this.hasGeoreferenceSubject.next(annotation !== null);
      }
    });
  }

  /**
   * Returns the cached annotation for a PID, or fetches it.
   * Returns null if no valid annotation exists or feature is disabled.
   */
  getAnnotation(pid: string): Observable<any | null> {
    if (!this.isEnabled()) {
      return of(null);
    }
    if (this.cache.has(pid)) {
      return of(this.cache.get(pid));
    }
    return this.fetchAnnotation(pid).pipe(
      tap(annotation => this.cache.set(pid, annotation))
    );
  }

  reset(): void {
    this.currentPid = null;
    this.hasGeoreferenceSubject.next(false);
  }

  private getApiBase(): string | undefined {
    return this.configService.api?.georefUrl;
  }

  private fetchAnnotation(pid: string): Observable<any | null> {
    const context = new HttpContext().set(SKIP_ERROR_INTERCEPTOR, true);
    return this.http.get<any>(this.getAnnotationUrl(pid), { context }).pipe(
      map(body => {
        const annotation = body?.payload?.annotation ?? body;
        if (!annotation || (annotation.type !== 'Annotation' && annotation.type !== 'AnnotationPage')) {
          return null;
        }
        return annotation;
      }),
      catchError(() => of(null))
    );
  }
}
