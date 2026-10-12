import { TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { AppUpdateService, buildFingerprint } from './app-update.service';
import { EnvironmentService } from './environment.service';

describe('AppUpdateService', () => {
  let service: AppUpdateService;
  let routerEvents: Subject<unknown>;
  let reloadSpy: jasmine.Spy;
  let loadSpy: jasmine.Spy;

  const running = { git_commit_hash: 'aaa', build_date: '2026-10-01T00:00:00Z' };

  function respondWith(info: object) {
    spyOn(window, 'fetch').and.resolveTo(new Response(JSON.stringify(info), { status: 200 }));
  }

  beforeEach(async () => {
    routerEvents = new Subject();
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { events: routerEvents } },
        { provide: Location, useValue: { prepareExternalUrl: (url: string) => url } },
        {
          provide: EnvironmentService,
          useValue: {
            whenBuildInfoReady: () => Promise.resolve(),
            get: (key: string) => (running as Record<string, string>)[key],
          },
        },
      ],
    });
    service = TestBed.inject(AppUpdateService);
    reloadSpy = spyOn<any>(service, 'reloadPage');
    loadSpy = spyOn<any>(service, 'loadPage');
    spyOn(window, 'setInterval').and.returnValue(0 as any);
    await service.start();
  });

  it('builds a fingerprint only when build info is present', () => {
    expect(buildFingerprint(null)).toBeNull();
    expect(buildFingerprint({})).toBeNull();
    expect(buildFingerprint(running)).toBe('aaa|2026-10-01T00:00:00Z');
  });

  it('does nothing on navigation while the deployed version is unchanged', async () => {
    respondWith(running);
    await service.check();
    routerEvents.next(new NavigationStart(1, '/search', 'imperative'));
    expect(loadSpy).not.toHaveBeenCalled();
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('loads the navigation target as a full page once a new version is deployed', async () => {
    respondWith({ ...running, git_commit_hash: 'bbb' });
    await service.check();
    expect(loadSpy).not.toHaveBeenCalled();

    routerEvents.next(new NavigationStart(1, '/view/uuid:1?page=2', 'imperative'));
    expect(loadSpy).toHaveBeenCalledOnceWith('/view/uuid:1?page=2');

    routerEvents.next(new NavigationStart(2, '/search', 'imperative'));
    expect(loadSpy).toHaveBeenCalledTimes(1);
  });

  it('reloads in place on back/forward navigation', async () => {
    respondWith({ ...running, build_date: '2026-10-09T00:00:00Z' });
    await service.check();
    routerEvents.next(new NavigationStart(1, '/search', 'popstate'));
    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(loadSpy).not.toHaveBeenCalled();
  });

  it('ignores a failed check', async () => {
    spyOn(window, 'fetch').and.rejectWith(new TypeError('offline'));
    await service.check();
    routerEvents.next(new NavigationStart(1, '/search', 'imperative'));
    expect(loadSpy).not.toHaveBeenCalled();
  });
});
