// This service is responsible for loading and providing the environment configuration for the application.
// It loads both runtime and build-time configurations.
// The runtime configuration is loaded from a JSON file (env.json) or from the static environment file (environment.ts), depending on the value of `useStaticRuntimeConfig` in the environment file.
// The build-time configuration is loaded from a JSON file (build-info.json).

import { Injectable } from '@angular/core';
import { environment as staticEnv } from '../../../environments/environment';
import { ensureTrailingSlash } from '../misc/trailing-slash';

@Injectable({ providedIn: 'root' })
export class EnvironmentService {

  private configRuntime: any = {};
  private configBuildtime: any = {};

  // Backend URL and library-switch flag resolved from config-main.json.
  // Pushed in by ConfigService.load() to avoid a circular dependency
  // (ConfigService injects EnvironmentService, not the other way around).
  private configApiBaseUrl: string | null = null;
  private librarySwitchEnabled = false;
  private baseCode = '';

  /**
   * Called by ConfigService once config-main.json is loaded. Provides the
   * single backend URL (`api.baseUrl`) the client points at, whether the
   * internal-only library switch is enabled (`features.librarySwitch`), and the
   * loaded library code (`app.code`).
   */
  public applyAppConfig(apiBaseUrl: string | null, librarySwitchEnabled: boolean, code: string): void {
    this.configApiBaseUrl = apiBaseUrl || null;
    this.librarySwitchEnabled = librarySwitchEnabled;
    this.baseCode = code || '';
  }

  /**
   * Whether the (undocumented, internal-testing) multi-library switch is on.
   * Off by default: the client is configured for a single Kramerius via
   * config-main.json and never reads from the central registry.
   */
  public isLibrarySwitchEnabled(): boolean {
    return this.librarySwitchEnabled;
  }

  /**
   * Base URL of the client API used for /ui-config/*, including the version
   * segment (e.g. https://.../search/api/client/v7.0). Empty when unset.
   * A non-empty value is what enables API config loading — there is no separate
   * on/off flag.
   */
  public getApiConfigBaseUrl(): string {
    return this.get('apiConfigBaseUrl') || '';
  }

  /**
   * Force mode: load config exclusively from the API and skip local-config
   * entirely. For deployments that ship no local-config files. Off by default.
   */
  public isApiConfigForced(): boolean {
    return this.get('forceApiConfig') === true;
  }

  public async load(): Promise<void> {
    // Load runtime configuration from env.json or static environment (environment.ts)
    if (staticEnv.useStaticRuntimeConfig) {
      try {
        const response = await fetch('/assets/env.json');
        if (!response.ok) throw new Error('env.json load failed');
        const data = await response.json();
        this.configRuntime = { ...staticEnv, ...data };
      } catch (err) {
        console.warn('env.json not found or invalid. Falling back to static env.');
        this.configRuntime = staticEnv;
      }
    } else {
      this.configRuntime = staticEnv;
    }
    // Load build info from build-info.json
    try {
      const response = await fetch('/assets/build-info.json');
      if (!response.ok) throw new Error('build-info.json load failed');
      const data = await response.json();
      this.configBuildtime = data;
    } catch (err) {
      console.warn('build-info.json not found or invalid. Skipping build info.');
      this.configBuildtime = {};
    }
  }

  public get(key: string): any {
    const fromRuntimeConfig = this.configRuntime[key];
    const fromBuildConfig = this.configBuildtime[key];
    if (fromRuntimeConfig !== undefined) {
      return fromRuntimeConfig;
    } else if (fromBuildConfig !== undefined) {
      return fromBuildConfig;
    } else {
      // console.warn(`Key "${key}" not found in configEnv or configBuildInfo.`);
      return undefined;
    }
  }

  getKrameriusUrl(withParam = true): string {
    // Internal-only library switch: when enabled, a selected dev library's
    // base URL is kept in localStorage. Ignored entirely in the default
    // (single-Kramerius) deployment.
    if (this.librarySwitchEnabled) {
      const devOverride = localStorage.getItem('CDK_DEV_BASE_URL');
      if (devOverride) {
        return ensureTrailingSlash(devOverride) + (withParam ? 'search/api/client/v7.0/' : '');
      }
    }

    // Primary source of truth: api.baseUrl from config-main.json. The whole
    // backend connection lives in config — the client points at a single
    // Kramerius and nothing is read from the central registry.
    const configBaseUrl = this.configApiBaseUrl;
    if (configBaseUrl) {
      // config-main.json's api.baseUrl already includes '/search/api/client';
      // append only the version segment when params are requested.
      const trimmed = configBaseUrl.replace(/\/+$/, '');
      const normalized = trimmed.replace(/\/search\/api\/client$/, '');
      return normalized + (withParam ? '/search/api/client/v7.0/' : '');
    }

    // No api.baseUrl means an invalid config; ConfigService.load() already
    // throws before we get here. Return empty rather than a hardcoded guess.
    return '';
  }

  getKrameriusId(): string {
    // The dev library id is only honored when the internal library switch is on.
    if (this.librarySwitchEnabled) {
      const devId = localStorage.getItem('CDK_DEV_KRAMERIUS_ID');
      if (devId) return devId;
    }
    return this.getBaseKrameriusId();
  }

  /**
   * The library code of the loaded instance, taken from config-main.json
   * (`app.code`), pushed in by ConfigService. Empty until config is loaded.
   * This is the instance whose config holds `features.librarySwitch`.
   */
  getBaseKrameriusId(): string {
    return this.baseCode;
  }

  getApiUrl(path: string = ''): string {
    // const baseUrl = this.get('krameriusBaseUrl');
    // return ensureTrailingSlash(baseUrl) + path.replace(/^\/+/, '');
    const baseUrl = this.getKrameriusUrl();

    return ensureTrailingSlash(baseUrl) + path.replace(/^\/+/, '');
  }

  getPureApiUrl(path: string = ''): string {
    const baseUrl = this.getKrameriusUrl(false);
    return ensureTrailingSlash(baseUrl) + path.replace(/^\/+/, '');
  }

  getBaseApiUrl(): string {
    // const fullUrl = this.get('krameriusBaseUrl');
    const fullUrl = this.getKrameriusUrl();
    try {
      const url = new URL(fullUrl);
      const base = `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}`;
      console.log('Base API URL:', base);
      return base;
    } catch (err) {
      console.error('Invalid URL:', fullUrl);
      return '';
    }
  }
}
