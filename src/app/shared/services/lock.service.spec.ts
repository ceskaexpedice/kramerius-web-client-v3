import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { LockService } from './lock.service';
import { EnvironmentService } from './environment.service';
import { AuthService } from '../../core/auth/auth.service';
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
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: EnvironmentService, useValue: { getApiUrl: (p = '') => API + p } },
        { provide: AuthService, useValue: { getAccessToken: () => 'token' } }
      ]
    });
    service = TestBed.inject(LockService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

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
});
