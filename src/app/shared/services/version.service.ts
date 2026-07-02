// Provides the client (frontend) version and the API (backend Kramerius) version.
// The client version comes from package.json, baked into build-info.json at build time
// and exposed via EnvironmentService. The API version is read from the central library
// registry (https://api.registr.digitalniknihovna.cz/api/libraries/{code}), which reports
// the deployed Kramerius version for each library.

import { inject, Injectable } from '@angular/core';
import { EnvironmentService } from './environment.service';
import { ConfigService } from '../../core/config/config.service';

@Injectable({ providedIn: 'root' })
export class VersionService {
  private envService = inject(EnvironmentService);

  private apiVersionCache = new Map<string, string>();

  /** Frontend client version (from package.json via build-info.json). */
  getClientVersion(): string {
    return this.envService.get('client_version') ?? '';
  }

  /**
   * Backend API (Kramerius) version for the active library, fetched from the
   * central library registry. Returns an empty string if unavailable.
   */
  async getApiVersion(): Promise<string> {
    const code = this.envService.getKrameriusId();
    if (!code) return '';

    const cached = this.apiVersionCache.get(code);
    if (cached !== undefined) return cached;

    try {
      const response = await fetch(`${ConfigService.getLibrariesUrl()}/${code}`);
      if (!response.ok) throw new Error('Failed to load library registry entry');
      const data = await response.json();
      const version: string = data?.version ?? '';
      this.apiVersionCache.set(code, version);
      return version;
    } catch {
      return '';
    }
  }
}
