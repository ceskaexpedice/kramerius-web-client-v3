import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, Subject } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { EnvironmentService } from './environment.service';
import { AuthService } from '../../core/auth/auth.service';
import { SKIP_ERROR_INTERCEPTOR } from '../../core/services/http-context-tokens';
import { AccessibleLock, LockItem } from '../models/document-info';

/**
 * Exclusive-reader locks ("zámkové licence") of the Kramerius client API.
 *
 * A lock license caps how many readers may view a title at once. `items/{pid}/info`
 * lists the locks the signed-in reader may request under `accessibleLocks`; the
 * reader then has to hold one before the backend serves the content under that
 * license. The lock lives only `refreshInterval` seconds past its last refresh
 * (and never beyond `maxTime`), so it is refreshed for as long as it is held.
 *
 * Endpoints (`/search/api/client/v7.0/locks`, Kramerius `LocksResource`):
 *   GET    locks/{hash}/refresh — acquires the lock, or refreshes the one held;
 *                                 409 when every slot is taken by other readers
 *   GET    locks/{hash}         — the lock held by this session; 404 when none
 *   DELETE locks/{hash}         — releases it
 *
 * The backend keys the lock on the session token, so only one lock is held at a
 * time here: the reader is on one document at a time.
 */
@Injectable({
  providedIn: 'root'
})
export class LockService {
  private http = inject(HttpClient);
  private env = inject(EnvironmentService);
  private authService = inject(AuthService);

  /** Refresh well before the lock lapses; the interval is the lapse, not a cadence. */
  private static readonly REFRESH_FRACTION = 0.5;
  private static readonly MIN_REFRESH_MS = 5_000;

  private _held = signal<{ lock: AccessibleLock; item: LockItem } | null>(null);
  /** The lock this session holds, with the backend's view of it. */
  readonly held = this._held.asReadonly();

  private _unavailable = signal<AccessibleLock | null>(null);
  /** A lock the reader may use, but whose every slot is currently taken (409). */
  readonly unavailable = this._unavailable.asReadonly();

  private lostSubject = new Subject<AccessibleLock>();
  /** Emits when a held lock could not be refreshed and is gone. */
  readonly lost$ = this.lostSubject.asObservable();

  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Background tabs throttle timers to about once a minute, which can outlast a
    // short refresh interval. Refresh as soon as the tab is back in view; if the
    // lock lapsed meanwhile the refresh re-acquires it while a slot is free.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && this._held()) {
        this.refreshHeld();
      }
    };
    // Closing the tab never reaches the app's own teardown, so free the slot for
    // the next reader instead of leaving it blocked until the lock lapses.
    const onPageHide = () => this.releaseOnUnload();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pagehide', onPageHide);
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pagehide', onPageHide);
      this.clearTimer();
    });
  }

  /** Whether the held lock's license is one of `licenses`. */
  holdsLicense(licenses: string[] | null | undefined): boolean {
    const held = this._held();
    return !!held && !!licenses?.includes(held.lock.right.license);
  }

  isHeld(hash: string): boolean {
    return this._held()?.lock.hash === hash;
  }

  /**
   * Acquires `lock`, dropping any other lock held. Resolves to whether the reader
   * now holds it; a 409 additionally marks it as `unavailable`.
   */
  acquire(lock: AccessibleLock): Observable<boolean> {
    if (this.isHeld(lock.hash)) {
      return of(true);
    }
    this.release();

    return this.requestRefresh(lock.hash).pipe(
      tap(item => {
        if (item) {
          this._held.set({ lock, item });
          this.scheduleRefresh(item);
        } else {
          this._unavailable.set(lock);
        }
      }),
      map(item => !!item),
    );
  }

  /** Releases the held lock, if any, and forgets an unavailable one. */
  release(): void {
    this.clearTimer();
    this._unavailable.set(null);
    const held = this._held();
    if (!held) return;
    this._held.set(null);

    this.http.delete(this.lockUrl(held.lock.hash), {
      context: new HttpContext().set(SKIP_ERROR_INTERCEPTOR, true)
    }).pipe(
      // Already gone (lapsed, or released elsewhere) is the outcome we wanted.
      catchError(() => of(null))
    ).subscribe();
  }

  /** Forgets an unavailable lock without touching the held one. */
  clearUnavailable(): void {
    this._unavailable.set(null);
  }

  private refreshHeld(): void {
    const held = this._held();
    if (!held) return;
    this.clearTimer();

    this.requestRefresh(held.lock.hash).subscribe(item => {
      // Released or swapped for another lock while the request was in flight.
      if (this._held()?.lock.hash !== held.lock.hash) return;

      if (item) {
        this._held.set({ lock: held.lock, item });
        this.scheduleRefresh(item);
      } else {
        this._held.set(null);
        this._unavailable.set(held.lock);
        this.lostSubject.next(held.lock);
      }
    });
  }

  /** The lock item on success, null when it cannot be had (409, 404, network). */
  private requestRefresh(hash: string): Observable<LockItem | null> {
    return this.http.get<LockItem>(`${this.lockUrl(hash)}/refresh`, {
      context: new HttpContext().set(SKIP_ERROR_INTERCEPTOR, true)
    }).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status !== 409) {
          console.warn(`LockService: refresh of lock ${hash} failed (${error.status})`);
        }
        return of(null);
      })
    );
  }

  private scheduleRefresh(item: LockItem): void {
    this.clearTimer();
    const intervalMs = (item.refreshInterval ?? 0) * 1000;
    const delayMs = Math.max(LockService.MIN_REFRESH_MS, intervalMs * LockService.REFRESH_FRACTION);
    this.refreshTimer = setTimeout(() => this.refreshHeld(), delayMs);
  }

  private clearTimer(): void {
    if (this.refreshTimer !== null) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * `HttpClient` requests are cancelled with the page, so the release goes out
   * through `fetch` with `keepalive`, which outlives it. The lock is keyed on the
   * session token, hence the explicit bearer header.
   */
  private releaseOnUnload(): void {
    const held = this._held();
    if (!held) return;
    this.clearTimer();
    this._held.set(null);

    const token = this.authService.getAccessToken();
    try {
      fetch(this.lockUrl(held.lock.hash), {
        method: 'DELETE',
        keepalive: true,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).catch(() => undefined);
    } catch {
      // Best effort: the lock lapses on its own after `refreshInterval`.
    }
  }

  private lockUrl(hash: string): string {
    return this.env.getApiUrl(`locks/${encodeURIComponent(hash)}`);
  }
}
