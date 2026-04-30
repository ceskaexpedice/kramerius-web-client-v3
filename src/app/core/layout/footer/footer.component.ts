import { Component, OnDestroy, OnInit } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { EnvironmentService } from '../../../shared/services/environment.service';
import { SettingsService } from '../../../modules/settings/settings.service';
import { ConfigService } from '../../config';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  imports: [TranslatePipe],
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

  getInovatikaLogo(): string {
    return this.effectiveTheme === 'dark'
      ? 'img/logo/inovatika-logo-dark.png'
      : 'img/logo/inovatika-logo.png';
  }

  private initializeTheme(): void {
    this.settingsService.effectiveTheme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(theme => {
        this.effectiveTheme = theme;
      });
  }

  private async initializeFooterLogo(): Promise<void> {
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
