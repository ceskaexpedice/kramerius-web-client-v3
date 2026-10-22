import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { LockService } from './lock.service';
import { EnvironmentService } from './environment.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfigService } from '../../core/config/config.service';
import { AccessibleLock, LockItem } from '../models/document-info';

const API = 'https://k7.example/search/api/client/v7.0/';

const LOCK: AccessibleLock = {
  right: { license: 'kkvhb_zamek', id: 65 },
  type: 'INSTANCE',
  hash: 'e90d2dd555b730c5b488c46e2c05d658'
};

const ITEM: LockItem = {
  username: 'zamkovy_uzivatel',
  tokenId: 't1',
  refreshInterval: 60,
  createdTime: '2026-10-19T07:00:00Z',
  refreshedTime: '2026-10-19T07:00:00Z',
  maxTime: '2026-10-19T08:00:00Z'
};

describe('LockService', () => {
  let service: LockService;
  let http: HttpTestingController;

  beforeEach(() => {
    Object.keys(localStorage)
      .filter(k => k.startsWith('kramerius-lock-holders:'))
      .forEach(k => localStorage.removeItem(k));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: EnvironmentService, useValue: { getApiUrl: (p = '') => API + p } },
        { provide: AuthService, useValue: { getAccessToken: () => 'token' } },
        { provide: ConfigService, useValue: { locks: { idleTimeoutSec: 300, warningSec: 60 } } }
      ]
    });
    service = TestBed.inject(LockService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    service.release();
    http.match(() => true).forEach(r => r.flush(null));
    http.verify();
  });

  /** Acquires LOCK and answers every refresh within `ms` of fake time. */
  function holdFor(ms: number, step = 1_000): void {
    for (let t = 0; t < ms; t += step) {
      tick(step);
      http.match(`${API}locks/${LOCK.hash}/refresh`).forEach(r => r.flush(ITEM));
    }
  }

  it('acquires a lock through locks/{hash}/refresh', () => {
    let acquired: boolean | undefined;
    service.acquire(LOCK).subscribe(r => acquired = r);
    http.expectOne(`${API}locks/${LOCK.hash}/refresh`).flush(ITEM);

    expect(acquired).toBeTrue();
    expect(service.isHeld(LOCK.hash)).toBeTrue();
    expect(service.holdsLicense(['kkvhb_zamek'])).toBeTrue();
    expect(service.unavailable()).toBeNull();
    service.release();
    http.expectOne(r => r.method === 'DELETE').flush(null);
  });

  it('marks the lock unavailable on 409', () => {
    let acquired: boolean | undefined;
    service.acquire(LOCK).subscribe(r => acquired = r);
    http.expectOne(`${API}locks/${LOCK.hash}/refresh`)
      .flush(null, { status: 409, statusText: 'Conflict' });

    expect(acquired).toBeFalse();
    expect(service.held()).toBeNull();
    expect(service.unavailable()).toEqual(LOCK);
  });

  it('refreshes before the interval lapses and reports a lost lock', fakeAsync(() => {
    const lost: AccessibleLock[] = [];
    service.lost$.subscribe(l => lost.push(l));
    service.acquire(LOCK).subscribe();
    http.expectOne(`${API}locks/${LOCK.hash}/refresh`).flush(ITEM);

    tick(30_000);
    http.expectOne(`${API}locks/${LOCK.hash}/refresh`).flush(ITEM);
    expect(service.isHeld(LOCK.hash)).toBeTrue();

    tick(30_000);
    http.expectOne(`${API}locks/${LOCK.hash}/refresh`)
      .flush(null, { status: 409, statusText: 'Conflict' });
    expect(service.held()).toBeNull();
    expect(lost).toEqual([LOCK]);
  }));

  it('releases the held lock with DELETE locks/{hash}', fakeAsync(() => {
    service.acquire(LOCK).subscribe();
    http.expectOne(`${API}locks/${LOCK.hash}/refresh`).flush(ITEM);

    service.release();
    const req = http.expectOne(`${API}locks/${LOCK.hash}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    expect(service.held()).toBeNull();

    // No refresh is left scheduled after release.
    tick(60_000);
  }));

  describe('idle reader', () => {
    // The idle watch is a timer, so the lock is taken inside each fakeAsync test.
    function acquireLock(): void {
      service.acquire(LOCK).subscribe();
      http.expectOne(`${API}locks/${LOCK.hash}/refresh`).flush(ITEM);
    }

    it('counts down over the last warningSec, then releases the lock', fakeAsync(() => {
      acquireLock();
      const lost: AccessibleLock[] = [];
      service.lost$.subscribe(l => lost.push(l));

      holdFor(239_000);
      expect(service.idleCountdown()).toBeNull();

      holdFor(2_000);
      expect(service.idleCountdown()).toBe(59);

      holdFor(59_000);
      expect(service.held()).toBeNull();
      expect(service.idleReleased()).toEqual(LOCK);
      expect(service.idleCountdown()).toBeNull();
      expect(lost).toEqual([LOCK]);
      expect(http.expectOne(`${API}locks/${LOCK.hash}`).request.method).toBe('DELETE');
    }));

    it('keeps the lock while the reader is active', fakeAsync(() => {
      acquireLock();
      holdFor(250_000);
      expect(service.idleCountdown()).not.toBeNull();

      document.dispatchEvent(new Event('keydown'));
      expect(service.idleCountdown()).toBeNull();

      holdFor(200_000);
      expect(service.isHeld(LOCK.hash)).toBeTrue();
      expect(service.idleReleased()).toBeNull();
      service.release();
      http.expectOne(`${API}locks/${LOCK.hash}`).flush(null);
    }));
  });

  describe('several tabs of one session', () => {
    it('does not release the server lock while another tab still uses it', fakeAsync(() => {
      localStorage.setItem(`kramerius-lock-holders:${LOCK.hash}`, JSON.stringify({ otherTab: Date.now() }));
      service.acquire(LOCK).subscribe();
      http.expectOne(`${API}locks/${LOCK.hash}/refresh`).flush(ITEM);

      service.release();
      http.expectNone(`${API}locks/${LOCK.hash}`);
      expect(service.held()).toBeNull();
      expect(JSON.parse(localStorage.getItem(`kramerius-lock-holders:${LOCK.hash}`)!)).toEqual({ otherTab: jasmine.any(Number) });
    }));

    it('ignores a tab that stopped refreshing', fakeAsync(() => {
      localStorage.setItem(`kramerius-lock-holders:${LOCK.hash}`, JSON.stringify({ deadTab: Date.now() - 120_000 }));
      service.acquire(LOCK).subscribe();
      http.expectOne(`${API}locks/${LOCK.hash}/refresh`).flush(ITEM);

      service.release();
      expect(http.expectOne(`${API}locks/${LOCK.hash}`).request.method).toBe('DELETE');
      expect(localStorage.getItem(`kramerius-lock-holders:${LOCK.hash}`)).toBeNull();
    }));
  });

  describe('leaving the page', () => {
    it('releases the lock with a keepalive DELETE when the tab closes', () => {
      const fetchSpy = spyOn(window, 'fetch').and.resolveTo(new Response(null));
      service.acquire(LOCK).subscribe();
      http.expectOne(`${API}locks/${LOCK.hash}/refresh`).flush(ITEM);

      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false }));

      expect(fetchSpy).toHaveBeenCalledOnceWith(`${API}locks/${LOCK.hash}`, jasmine.objectContaining({
        method: 'DELETE',
        keepalive: true,
        headers: { Authorization: 'Bearer token' }
      }));
      expect(service.held()).toBeNull();
    });

    it('reports the lock lost when the page comes back from the bfcache', () => {
      spyOn(window, 'fetch').and.resolveTo(new Response(null));
      const lost: AccessibleLock[] = [];
      service.lost$.subscribe(l => lost.push(l));
      service.acquire(LOCK).subscribe();
      http.expectOne(`${API}locks/${LOCK.hash}/refresh`).flush(ITEM);

      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));

      expect(lost).toEqual([LOCK]);
    });
  });
});
