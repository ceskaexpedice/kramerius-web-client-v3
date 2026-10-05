import { inject, Injectable } from '@angular/core';
import { ConfigService } from '../../core/config/config.service';
import { AnalyticsConfig } from '../../core/config/config.interfaces';

/**
 * Hostname → GA4 measurement ID for the two Trinera deployments.
 *
 * This is a convenience fallback for our own test/app instances so they keep
 * reporting without carrying analytics in their config. It is deliberately NOT
 * the primary source: `integrations.analytics.measurementId` wins whenever it
 * is set, so any instance — these two included — can override or switch it off
 * from config-main.json alone.
 */
const HOSTNAME_FALLBACK_IDS: ReadonlyArray<readonly [string, string]> = [
  ['cdk.test.trinera.cloud', 'G-W742T420R3'],
  ['cdk.app.trinera.cloud', 'G-674F59YZR2']
];

/**
 * Loads the Google Analytics (GA4) tag.
 *
 * The tag used to be hardcoded in `index.html` and keyed purely off the
 * hostname, which tied analytics to those two domains and left every other
 * instance unable to turn it on at all. Resolution order is now:
 *
 *   1. `integrations.analytics.measurementId` from config-main.json
 *   2. the hostname fallback above (test deployments only)
 *
 * `integrations.analytics.enabled: false` suppresses both.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private configService = inject(ConfigService);

  private _initialized = false;

  get config(): AnalyticsConfig | undefined {
    return this.configService.integrations?.analytics;
  }

  /**
   * The ID written in config, ignoring the `G-XXXXXXXXXX` placeholder that
   * ships in the sample config — loading the tag with that only produces
   * failing requests.
   */
  private get configuredId(): string {
    const id = this.config?.measurementId?.trim() || '';
    return id && !/^G-X+$/i.test(id) ? id : '';
  }

  /**
   * ID for the current hostname, for the Trinera test/app deployments that do
   * not carry analytics in their own config. Subdomains match too, matching the
   * `endsWith` behaviour of the original index.html snippet.
   *
   * Read through `currentHostname()` because `window.location.hostname` is a
   * non-configurable property and so cannot be stubbed directly in tests.
   */
  protected currentHostname(): string {
    return window.location.hostname;
  }

  private get hostnameFallbackId(): string {
    const host = this.currentHostname();
    const hit = HOSTNAME_FALLBACK_IDS.find(
      ([domain]) => host === domain || host.endsWith(`.${domain}`)
    );
    return hit ? hit[1] : '';
  }

  /** Config first, hostname only as a fallback. */
  get measurementId(): string {
    return this.configuredId || this.hostnameFallbackId;
  }

  /**
   * Whether analytics is switched on and usable.
   *
   * `enabled` defaults to on when the whole analytics block is absent, so the
   * hostname fallback still applies to a config that says nothing about
   * analytics. An explicit `enabled: false` always wins.
   */
  get enabled(): boolean {
    const cfg = this.config;
    if (cfg && cfg.enabled === false) {
      return false;
    }
    if (cfg?.provider && cfg.provider !== 'ga4') {
      return false;
    }
    return !!this.measurementId;
  }

  /**
   * Injects the gtag script. Safe to call repeatedly — only the first call
   * with a usable config does anything.
   */
  init(): void {
    if (this._initialized || !this.enabled) {
      return;
    }
    this._initialized = true;

    const gId = this.measurementId;
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gId)}`;
    script.async = true;
    script.onerror = () => {
      this._initialized = false;
      console.error('Failed to load Google Analytics');
    };
    script.onload = () => {
      const w = window as any;
      w.dataLayer = w.dataLayer || [];
      function gtag(...args: any[]) {
        w.dataLayer.push(arguments);
      }
      w.gtag = gtag;
      gtag('js', new Date());
      gtag('config', gId);
    };
    document.head.appendChild(script);
  }
}
