import { TestBed } from '@angular/core/testing';
import { Router, UrlSegment, provideRouter } from '@angular/router';
import { EnvironmentService } from '../../shared/services/environment.service';
import { libraryPrefixGuard, __resetLibraryCacheForTests } from './library-prefix.guard';

/**
 * Regression tests for the `/:libCode` prefix route.
 *
 * The route used `canActivate`, which only runs once a route has already been
 * chosen: an unknown single-segment URL was swallowed by `:libCode` and could
 * never fall through to the `**` wildcard. The guard papered over it by
 * redirecting to /404 itself, at the cost of a registry `fetch` and a rewritten
 * URL for every bad address. As a `canMatch` guard it simply declines to match,
 * so the router keeps looking and the real 404 route handles it.
 */
describe('libraryPrefixGuard', () => {

  /** Runs the guard the way the router runs a CanMatchFn: route + url segments. */
  function run(libCode: string): Promise<boolean> {
    const segments = libCode ? [new UrlSegment(libCode, {})] : [];
    return TestBed.runInInjectionContext(
      () => libraryPrefixGuard({ path: ':libCode' } as any, segments as any),
    ) as Promise<boolean>;
  }

  function configure(opts: { librarySwitch: boolean }): void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: EnvironmentService,
          useValue: { isLibrarySwitchEnabled: () => opts.librarySwitch },
        },
      ],
    });
  }

  beforeEach(() => {
    __resetLibraryCacheForTests();
    localStorage.removeItem('CDK_DEV_KRAMERIUS_ID');
    localStorage.removeItem('CDK_DEV_BASE_URL');
  });

  afterEach(() => {
    localStorage.removeItem('CDK_DEV_KRAMERIUS_ID');
    localStorage.removeItem('CDK_DEV_BASE_URL');
  });

  it('declines to match instead of redirecting when the switch is off', async () => {
    // Returning a UrlTree here would consume the URL; returning false lets the
    // router continue to the wildcard route, which renders the real 404 page.
    configure({ librarySwitch: false });
    const result = await run('nonsense');
    expect(result).toBe(false);
  });

  it('does not touch the central registry when the switch is off', async () => {
    configure({ librarySwitch: false });
    const fetchSpy = spyOn(window, 'fetch');
    await run('nonsense');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('declines to match an unknown library code', async () => {
    configure({ librarySwitch: true });
    spyOn(window, 'fetch').and.resolveTo(new Response('', { status: 404 }));
    const result = await run('nonsense');
    expect(result).toBe(false);
  });

  it('leaves the URL untouched when it declines a bad code', async () => {
    // The wildcard route owns the 404; the guard must not rewrite the URL itself.
    configure({ librarySwitch: true });
    spyOn(window, 'fetch').and.resolveTo(new Response('', { status: 404 }));
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl');
    const result = await run('nonsense');
    expect(result).toBe(false);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('matches when the requested library is already the active one', async () => {
    configure({ librarySwitch: true });
    localStorage.setItem('CDK_DEV_KRAMERIUS_ID', 'mzk');
    localStorage.setItem('CDK_DEV_BASE_URL', 'https://kramerius.mzk.cz');
    const fetchSpy = spyOn(window, 'fetch');
    const result = await run('mzk');
    expect(result).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('declines to match an empty code', async () => {
    configure({ librarySwitch: true });
    const result = await run('');
    expect(result).toBe(false);
  });
});

/**
 * End-to-end routing check: the guard returning false is only useful if the
 * router actually continues past `:libCode` to the wildcard. This exercises the
 * real matcher rather than the guard in isolation.
 */
describe('libraryPrefixGuard route fall-through', () => {
  const NotFoundStub = class {};
  const LibraryHomeStub = class {};

  function configure(librarySwitch: boolean) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '404', component: NotFoundStub as any },
          {
            path: ':libCode',
            canMatch: [libraryPrefixGuard],
            children: [{ path: '', component: LibraryHomeStub as any }],
          },
          { path: '**', redirectTo: '404' },
        ]),
        {
          provide: EnvironmentService,
          useValue: { isLibrarySwitchEnabled: () => librarySwitch },
        },
      ],
    });
  }

  beforeEach(() => {
    __resetLibraryCacheForTests();
    localStorage.removeItem('CDK_DEV_KRAMERIUS_ID');
    localStorage.removeItem('CDK_DEV_BASE_URL');
  });

  afterEach(() => {
    localStorage.removeItem('CDK_DEV_KRAMERIUS_ID');
    localStorage.removeItem('CDK_DEV_BASE_URL');
  });

  it('lands an unknown single-segment URL on the 404 route', async () => {
    configure(true);
    spyOn(window, 'fetch').and.resolveTo(new Response('', { status: 404 }));
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/nonsense');

    expect(router.url).toBe('/404');
  });

  it('lands on 404 without a registry call when the switch is off', async () => {
    configure(false);
    const fetchSpy = spyOn(window, 'fetch');
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/nonsense');

    expect(router.url).toBe('/404');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('still routes into a valid library prefix', async () => {
    configure(true);
    localStorage.setItem('CDK_DEV_KRAMERIUS_ID', 'mzk');
    localStorage.setItem('CDK_DEV_BASE_URL', 'https://kramerius.mzk.cz');
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/mzk');

    expect(router.url).toBe('/mzk');
  });
});
