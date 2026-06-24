import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { EnvironmentService } from '../../../shared/services/environment.service';
import { SettingsService } from '../../../modules/settings/settings.service';
import { ConfigService } from '../../config';
import { FooterGroup, FooterLink, FooterLogo } from '../../config/config.interfaces';
import { LocalizedPipe } from '../../../shared/pipes/localized.pipe';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  imports: [TranslatePipe, LocalizedPipe, RouterLink],
  standalone: true,
})
export class FooterComponent implements OnInit, OnDestroy {
  private static readonly LOGO_CLICK_THRESHOLD = 5;
  private static readonly LOGO_CLICK_TIMEOUT = 200;
  private static readonly LOGO_CLICK_SUCCESS_TIMEOUT = 1000;

  footerLogo: string = 'img/logo.svg';
  effectiveTheme: 'light' | 'dark' = 'light';

  private gitCommitUrl: string | null = null;
  private logoClickCount = 0;
  private logoClickTimer: ReturnType<typeof setTimeout> | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private envService: EnvironmentService,
    private configService: ConfigService,
    private settingsService: SettingsService,
  ) {}

  ngOnInit(): void {
    this.initializeTheme();
    this.initializeFooterLogo();
    this.initializeGitCommitUrl();
  }

  ngOnDestroy(): void {
    this.clearLogoClickTimer();
    this.destroy$.next();
    this.destroy$.complete();
  }

  onLogoClick(): void {
    if (!this.gitCommitUrl) return;

    this.logoClickCount++;
    this.clearLogoClickTimer();

    if (this.logoClickCount >= FooterComponent.LOGO_CLICK_THRESHOLD) {
      window.open(this.gitCommitUrl, '_blank');
      this.resetLogoClickCount(FooterComponent.LOGO_CLICK_SUCCESS_TIMEOUT);
      return;
    }

    this.logoClickTimer = setTimeout(
      () => this.resetLogoClickCount(0),
      FooterComponent.LOGO_CLICK_TIMEOUT,
    );
  }

  get footerGroups(): FooterGroup[] {
    return this.configService.footerGroups;
  }

  get footerLinks(): FooterLink[] {
    return this.configService.footerLinks;
  }

  /**
   * Resolve a logo's image source, preferring its dark-theme variant when the
   * effective theme is dark and one is configured.
   */
  logoSrc(logo: FooterLogo): string {
    return this.effectiveTheme === 'dark' && logo.srcDark ? logo.srcDark : logo.src;
  }

  private initializeTheme(): void {
    this.settingsService.effectiveTheme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(theme => {
        this.effectiveTheme = theme;
      });
  }

  private async initializeFooterLogo(): Promise<void> {
    // CDK always uses its own logo, regardless of any selected dev library.
    if (this.configService.isCdk()) {
      this.footerLogo = 'img/logo.svg';
      return;
    }
    const activeLib = await this.configService.getActiveLibrary();
    this.footerLogo = activeLib?.logo ?? this.configService.app.logo ?? 'img/logo.svg';
  }

  private initializeGitCommitUrl(): void {
    const commitHash = this.envService.get('git_commit_hash');
    if (commitHash) {
      this.gitCommitUrl = `https://github.com/trineracz/CDK-klient/commit/${commitHash}`;
    }
  }

  private resetLogoClickCount(delay: number): void {
    this.logoClickTimer = setTimeout(() => {
      this.logoClickCount = 0;
      this.logoClickTimer = null;
    }, delay);
  }

  private clearLogoClickTimer(): void {
    if (this.logoClickTimer) {
      clearTimeout(this.logoClickTimer);
      this.logoClickTimer = null;
    }
  }
}
