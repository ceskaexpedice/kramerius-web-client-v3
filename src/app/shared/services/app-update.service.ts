// Detects a newly deployed client version and silently switches to it on the
// next in-app navigation.
//
// Every build writes assets/build-info.json (scripts/collect-build-info.js),
// which nginx serves with "no-cache". The fingerprint read at startup is the
// running version; the file is re-fetched when the tab becomes visible again
// and every 30 minutes. Once it differs, the next router navigation is turned
// into a full page load of the target URL, so the user lands where they were
// going — on the new version — without ever being interrupted mid-page.

import { inject, Injectable, NgZone } from '@angular/core';
import { Location } from '@angular/common';
import { NavigationStart, Router } from '@angular/router';
import { filter, take } from 'rxjs';
import { EnvironmentService } from './environment.service';

const BUILD_INFO_URL = '/assets/build-info.json';
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

interface BuildInfo {
  git_commit_hash?: string;
  build_date?: string;
}

export function buildFingerprint(info: BuildInfo | null | undefined): string | null {
  if (!info?.git_commit_hash && !info?.build_date) return null;
  return `${info.git_commit_hash ?? ''}|${info.build_date ?? ''}`;
}

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private env = inject(EnvironmentService);
  private router = inject(Router);
  private location = inject(Location);
  private zone = inject(NgZone);

  private runningFingerprint: string | null = null;
  private updatePending = false;
  private started = false;

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    await this.env.whenBuildInfoReady();
    this.runningFingerprint = buildFingerprint({
      git_commit_hash: this.env.get('git_commit_hash'),
      build_date: this.env.get('build_date'),
    });
    // No build info (e.g. local dev without the prebuild step): nothing to compare.
    if (!this.runningFingerprint) return;

    this.zone.runOutsideAngular(() => {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') this.check();
      });
      setInterval(() => this.check(), CHECK_INTERVAL_MS);
    });
  }

  /** Re-fetch build-info.json and arm the reload when the deployed version changed. */
  async check(): Promise<void> {
    if (this.updatePending || !this.runningFingerprint) return;

    let deployed: string | null;
    try {
      const response = await fetch(BUILD_INFO_URL, { cache: 'no-store' });
      if (!response.ok) return;
      deployed = buildFingerprint(await response.json());
    } catch {
      return; // Offline or transient failure — try again on the next trigger.
    }

    if (deployed && deployed !== this.runningFingerprint) {
      this.armReloadOnNextNavigation();
    }
  }

  private armReloadOnNextNavigation(): void {
    this.updatePending = true;
    console.info('AppUpdate: new version deployed, reloading on next navigation.');

    this.router.events
      .pipe(filter((e): e is NavigationStart => e instanceof NavigationStart), take(1))
      .subscribe(event => {
        if (event.navigationTrigger === 'popstate') {
          // Back/forward: the address bar already shows the target URL.
          this.reloadPage();
        } else {
          this.loadPage(this.location.prepareExternalUrl(event.url));
        }
      });
  }

  // Thin wrappers so tests can stub the actual page loads.
  protected reloadPage(): void {
    window.location.reload();
  }

  protected loadPage(url: string): void {
    window.location.assign(url);
  }
}
