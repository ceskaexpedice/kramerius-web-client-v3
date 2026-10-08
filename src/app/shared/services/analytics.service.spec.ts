import { TestBed } from '@angular/core/testing';
import { AnalyticsService } from './analytics.service';
import { ConfigService } from '../../core/config/config.service';
import { AnalyticsConfig } from '../../core/config/config.interfaces';

/**
 * The GA4 tag used to be hardcoded in index.html and keyed purely off the
 * hostname: only `cdk.test.trinera.cloud` and `cdk.app.trinera.cloud` ever got
 * analytics, and no other deployment could turn it on. It is now driven by
 * `integrations.analytics` in config-main.json, with the hostname kept only as
 * a fallback for those two test deployments.
 */
describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let appended: HTMLScriptElement[];

  function setup(analytics: AnalyticsConfig | undefined, hostname = 'kramerius.example.org') {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: ConfigService, useValue: { integrations: analytics ? { analytics } : undefined } }
      ]
    });
    service = TestBed.inject(AnalyticsService);
    // `window.location.hostname` is non-configurable, so the service reads it
    // through `currentHostname()`; stub that instead.
    spyOn(service as any, 'currentHostname').and.returnValue(hostname);
  }

  beforeEach(() => {
    appended = [];
    spyOn(document.head, 'appendChild').and.callFake(((node: any) => {
      appended.push(node);
      return node;
    }) as any);
  });

  afterEach(() => {
    delete (window as any).gtag;
    delete (window as any).dataLayer;
  });

  function loadedId(): string {
    return new URL(appended[0].src).searchParams.get('id') || '';
  }

  describe('config-driven', () => {
    it('loads the tag with the configured measurement ID', () => {
      setup({ provider: 'ga4', enabled: true, measurementId: 'G-ABC123' });

      service.init();

      expect(appended.length).toBe(1);
      expect(loadedId()).toBe('G-ABC123');
      expect(appended[0].async).toBeTrue();
    });

    it('configures gtag with the same ID once the script loads', () => {
      setup({ provider: 'ga4', enabled: true, measurementId: 'G-ABC123' });

      service.init();
      appended[0].onload!(new Event('load'));

      const calls = ((window as any).dataLayer as IArguments[]).map(a => Array.from(a));
      expect(calls).toContain(['config', 'G-ABC123'] as any);
      expect(typeof (window as any).gtag).toBe('function');
    });

    it('does nothing when analytics is disabled', () => {
      setup({ provider: 'ga4', enabled: false, measurementId: 'G-ABC123' });

      service.init();

      expect(appended.length).toBe(0);
      expect(service.enabled).toBeFalse();
    });

    it('does nothing on an unknown host when the measurement ID is missing', () => {
      setup({ enabled: true });

      service.init();

      expect(appended.length).toBe(0);
    });

    it('treats the sample placeholder ID as not configured', () => {
      setup({ provider: 'ga4', enabled: true, measurementId: 'G-XXXXXXXXXX' });

      service.init();

      expect(appended.length).toBe(0);
    });

    it('ignores a non-ga4 provider', () => {
      setup({ provider: 'matomo', enabled: true, measurementId: 'G-ABC123' });

      service.init();

      expect(appended.length).toBe(0);
    });

    it('loads the tag only once across repeated init calls', () => {
      setup({ provider: 'ga4', enabled: true, measurementId: 'G-ABC123' });

      service.init();
      service.init();

      expect(appended.length).toBe(1);
    });
  });

  describe('hostname fallback', () => {
    it('uses the test-deployment ID when config carries no analytics block', () => {
      setup(undefined, 'cdk.test.trinera.cloud');

      service.init();

      expect(loadedId()).toBe('G-W742T420R3');
    });

    it('uses the app-deployment ID when config carries no analytics block', () => {
      setup(undefined, 'cdk.app.trinera.cloud');

      service.init();

      expect(loadedId()).toBe('G-674F59YZR2');
    });

    it('matches subdomains of a known deployment', () => {
      setup(undefined, 'foo.cdk.test.trinera.cloud');

      service.init();

      expect(loadedId()).toBe('G-W742T420R3');
    });

    it('does not match a host that merely ends with the same suffix text', () => {
      setup(undefined, 'notcdk.test.trinera.cloud');

      service.init();

      expect(appended.length).toBe(0);
    });

    it('stays off on any other host when config carries no analytics block', () => {
      setup(undefined, 'kramerius.example.org');

      service.init();

      expect(appended.length).toBe(0);
    });

    it('lets a configured ID win over the hostname fallback', () => {
      setup({ provider: 'ga4', enabled: true, measurementId: 'G-OWN999' }, 'cdk.test.trinera.cloud');

      service.init();

      expect(loadedId()).toBe('G-OWN999');
    });

    it('lets an explicit enabled:false switch off a fallback host', () => {
      setup({ enabled: false }, 'cdk.test.trinera.cloud');

      service.init();

      expect(appended.length).toBe(0);
    });
  });
});
