import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, Subject } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { EnvironmentService } from './environment.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfigService } from '../../core/config/config.service';
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
 * A slot is scarce, so a reader who walks away must not keep it: after
 * `locks.idleTimeoutSec` without any input the lock is released for the next
 * reader, with a countdown (`idleCountdown`) over the last `locks.warningSec`.
 *
 * The backend keys the lock on the session token, so every tab of the same
 * session shares one lock. Tabs register in localStorage while they hold it,
 * and only the last one to let go actually releases it on the server.
 */
@Injectable({
  providedIn: 'root'
})
export class LockService {
  private http = inject(HttpClient);
  private env = inject(EnvironmentService);
  private authService = inject(AuthService);
  private configService = inject(ConfigService);

  /** Refresh well before the lock lapses; the interval is the lapse, not a cadence. */
  private static readonly REFRESH_FRACTION = 0.5;
  private static readonly MIN_REFRESH_MS = 5_000;
  private static readonly IDLE_CHECK_MS = 1_000;
  private static readonly HOLDERS_KEY_PREFIX = 'kramerius-lock-holders:';
  /** Input events that prove the reader is still at the screen. */
  private static readonly ACTIVITY_EVENTS = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'scroll', 'touchstart'];

  private readonly tabId = Math.random().toString(36).slice(2);

  private _held = signal<{ lock: AccessibleLock; item: LockItem } | null>(null);
  /** The lock this session holds, with the backend's view of it. */
  readonly held = this._held.asReadonly();

  private _unavailable = signal<AccessibleLock | null>(null);
  /** A lock the reader may use, but whose every slot is currently taken (409). */
  readonly unavailable = this._unavailable.asReadonly();

  private _idleReleased = signal<AccessibleLock | null>(null);
  /**
   * A lock let go because the reader was idle. It is not re-acquired on its own —
   * the reader has to ask for it again (`clearIdleReleased` + reload).
   */
  readonly idleReleased = this._idleReleased.asReadonly();

  private _idleCountdown = signal<number | null>(null);
  /** Seconds left before an idle reader loses the lock; null outside the warning. */
  readonly idleCountdown = this._idleCountdown.asReadonly();

  private lostSubject = new Subject<AccessibleLock>();
  /** Emits when a held lock is gone: it could not be refreshed, or the reader went idle. */
  readonly lost$ = this.lostSubject.asObservable();

  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private idleTimer: ReturnType<typeof setInterval> | null = null;
  private lastActivity = Date.now();
  /** The lock let go by `pagehide`, in case the page is restored from the bfcache. */
  private releasedOnHide: AccessibleLock | null = null;

  constructor() {
    const onActivity = () => this.markActive();
    // Background tabs throttle timers to about once a minute, which can outlast a
    // short refresh interval. Settle the idle state first (the time away counts as
    // idle — no input arrives in a hidden tab), then refresh what is still held.
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || !this._held()) return;
      this.checkIdle();
      if (this._held()) {
        this.refreshHeld();
      }
    };
    // Closing the tab never reaches the app's own teardown, so free the slot for
    // the next reader instead of leaving it blocked until the lock lapses.
    const onPageHide = () => this.releaseOnUnload();
    // Back/forward cache: the page comes back as it was left, but its lock was
    // released on the way out. Report it lost, so the page takes it again.
    const onPageShow = (event: PageTransitionEvent) => {
      const lock = this.releasedOnHide;
      this.releasedOnHide = null;
      if (event.persisted && lock && !this._held()) {
        this.lostSubject.next(lock);
      }
    };

    const options = { capture: true, passive: true };
    LockService.ACTIVITY_EVENTS.forEach(e => document.addEventListener(e, onActivity, options));
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
    inject(DestroyRef).onDestroy(() => {
      LockService.ACTIVITY_EVENTS.forEach(e => document.removeEventListener(e, onActivity, options));
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
      this.clearTimers();
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

  /** The reader is at the screen: restart the idle clock and drop a running countdown. */
  markActive(): void {
    this.lastActivity = Date.now();
    if (this._idleCountdown() !== null) {
      this._idleCountdown.set(null);
    }
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
    this._idleReleased.set(null);

    return this.requestRefresh(lock.hash).pipe(
      tap(item => {
        if (item) {
          this._held.set({ lock, item });
          this.registerHolder(lock.hash);
          this.scheduleRefresh(item);
          this.startIdleWatch();
        } else {
          this._unavailable.set(lock);
        }
      }),
      map(item => !!item),
    );
  }

  /**
   * Lets go of the held lock, if any, and forgets an unavailable one. The server
   * lock is released only when no other tab of this session still uses it.
   */
  release(): void {
    this.clearTimers();
    this._unavailable.set(null);
    this._idleCountdown.set(null);
    const held = this._held();
    if (!held) return;
    this._held.set(null);

    if (this.unregisterHolder(held)) return;

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

  /** Lets the next info load acquire a lock released for idleness again. */
  clearIdleReleased(): void {
    this._idleReleased.set(null);
  }

  private startIdleWatch(): void {
    this.markActive();
    if (this.idleTimer === null) {
      this.idleTimer = setInterval(() => this.checkIdle(), LockService.IDLE_CHECK_MS);
    }
  }

  private checkIdle(): void {
    const held = this._held();
    if (!held) return;

    const { idleTimeoutSec, warningSec } = this.configService.locks;
    const remainingMs = idleTimeoutSec * 1000 - (Date.now() - this.lastActivity);

    if (remainingMs <= 0) {
      this.release();
      this._idleReleased.set(held.lock);
      this.lostSubject.next(held.lock);
    } else if (remainingMs <= warningSec * 1000) {
      this._idleCountdown.set(Math.ceil(remainingMs / 1000));
    } else if (this._idleCountdown() !== null) {
      this._idleCountdown.set(null);
    }
  }

  private refreshHeld(): void {
    const held = this._held();
    if (!held) return;
    this.clearRefreshTimer();

    this.requestRefresh(held.lock.hash).subscribe(item => {
      // Released or swapped for another lock while the request was in flight.
      if (this._held()?.lock.hash !== held.lock.hash) return;

      if (item) {
        this._held.set({ lock: held.lock, item });
        this.registerHolder(held.lock.hash);
        this.scheduleRefresh(item);
      } else {
        this.clearTimers();
        this._idleCountdown.set(null);
        this._held.set(null);
        this.unregisterHolder(held);
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
    this.clearRefreshTimer();
    const intervalMs = (item.refreshInterval ?? 0) * 1000;
    const delayMs = Math.max(LockService.MIN_REFRESH_MS, intervalMs * LockService.REFRESH_FRACTION);
    this.refreshTimer = setTimeout(() => this.refreshHeld(), delayMs);
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer !== null) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearRefreshTimer();
    if (this.idleTimer !== null) {
      clearInterval(this.idleTimer);
      this.idleTimer = null;
    }
  }

  /** Records this tab as a live user of the lock; renewed on every refresh. */
  private registerHolder(hash: string): void {
    this.updateHolders(hash, holders => ({ ...holders, [this.tabId]: Date.now() }));
  }

  /**
   * Removes this tab from the lock's users. Returns whether another tab still
   * uses the lock — one whose entry was renewed within a refresh interval, since
   * a live tab renews it every half interval. Entries of tabs that died without
   * cleaning up go stale and are dropped here.
   */
  private unregisterHolder(held: { lock: AccessibleLock; item: LockItem }): boolean {
    const staleBefore = Date.now() - Math.max(LockService.MIN_REFRESH_MS, (held.item.refreshInterval ?? 0) * 1000);
    let othersAlive = false;
    this.updateHolders(held.lock.hash, holders => {
      const live: Record<string, number> = {};
      for (const [tab, seen] of Object.entries(holders)) {
        if (tab !== this.tabId && seen >= staleBefore) {
          live[tab] = seen;
        }
      }
      othersAlive = Object.keys(live).length > 0;
      return live;
    });
    return othersAlive;
  }

  private updateHolders(hash: string, update: (holders: Record<string, number>) => Record<string, number>): void {
    const key = LockService.HOLDERS_KEY_PREFIX + hash;
    try {
      const next = update(JSON.parse(localStorage.getItem(key) ?? '{}'));
      if (Object.keys(next).length) {
        localStorage.setItem(key, JSON.stringify(next));
      } else {
        localStorage.removeItem(key);
      }
    } catch {
      // No storage (private mode, quota): every tab acts alone, as without the registry.
      update({});
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
    this.clearTimers();
    this._held.set(null);
    this.releasedOnHide = held.lock;
    if (this.unregisterHolder(held)) return;

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
