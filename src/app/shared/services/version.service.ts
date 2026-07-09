// Provides the client (frontend) version and the API (backend Kramerius) version.
// The client version comes from package.json, baked into build-info.json at build time
// and exposed via EnvironmentService. The API version is read directly from the
// configured Kramerius instance's client API info endpoint
// ({baseUrl}/search/api/client/v7.0/info), which reports the deployed version,
// index schema version and base API URL.

import { inject, Injectable } from '@angular/core';
import { EnvironmentService } from './environment.service';

export interface ApiInfo {
  /** Deployed Kramerius version (e.g. "7.2.1.1"). */
  version: string;
  /** Index schema version reported by the instance (e.g. 23). */
  indexerVersion: number | null;
  /** Base API URL of the instance (e.g. ".../search/api/client"). */
  baseApiUrl: string;
}

@Injectable({ providedIn: 'root' })
export class VersionService {
  private envService = inject(EnvironmentService);

  private apiInfoCache = new Map<string, ApiInfo>();

  /** Frontend client version (from package.json via build-info.json). */
  getClientVersion(): string {
    return this.envService.get('client_version') ?? '';
  }

  /**
   * Backend API (Kramerius) info for the active library, fetched directly from
   * the instance's client API info endpoint. Returns empty values if unavailable.
   */
  async getApiInfo(): Promise<ApiInfo> {
    const baseApiUrl = this.envService.getPureApiUrl();
    const url = this.envService.getApiUrl('info');
    if (!url) return { version: '', indexerVersion: null, baseApiUrl };

    const cached = this.apiInfoCache.get(url);
    if (cached !== undefined) return cached;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to load Kramerius info');
      const data = await response.json();
      const info: ApiInfo = {
        version: data?.version ?? '',
        indexerVersion: data?.indexerVersion ?? null,
        baseApiUrl
      };
      this.apiInfoCache.set(url, info);
      return info;
    } catch {
      return { version: '', indexerVersion: null, baseApiUrl };
    }
  }
}
