import { Component, OnInit, OnDestroy } from '@angular/core';
import {Router, NavigationEnd, RouterLink} from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { APP_ROUTES_ENUM } from '../../../app.routes';
import { HeaderType } from './header-types';
import { SettingsService } from '../../../modules/settings/settings.service';
import { AppSettingsThemeEnum } from '../../../modules/settings/settings.model';
import {NgClass, NgIf} from '@angular/common';
import {AutocompleteComponent} from '../../../shared/components/autocomplete/autocomplete.component';
import {LangPickerComponent} from '../../../shared/translation/lang-picker/lang-picker.component';
import {SearchService} from '../../../shared/services/search.service';
import {TranslatePipe} from '@ngx-translate/core';
import {AdvancedSearchService} from '../../../shared/services/advanced-search.service';
import { EnvironmentService } from '../../../shared/services/environment.service';
import {RecordHandlerService} from '../../../shared/services/record-handler.service';
import * as AuthActions from '../../auth/store/auth.actions';
import {Store} from '@ngrx/store';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  imports: [
    NgClass,
    NgIf,
    AutocompleteComponent,
    LangPickerComponent,
    RouterLink,
    TranslatePipe,
  ],
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit, OnDestroy {
  headerType: HeaderType = 'transparent';
  private routerSubscription?: Subscription;
  private themeSubscription?: Subscription;

  // Track the application's current theme
  currentAppTheme: AppSettingsThemeEnum = AppSettingsThemeEnum.LIGHT;

  constructor(
    private envService: EnvironmentService,
    private router: Router,
    private settingsService: SettingsService,
    public searchService: SearchService,
    private advancedSearch: AdvancedSearchService,
    private recordHandler: RecordHandlerService,
    private store: Store
  ) {}

  ngOnInit() {
    // Listen for route changes to update header type
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateHeaderType();
      });

    // Subscribe to app theme changes
    this.themeSubscription = this.settingsService.settings$.subscribe(settings => {
      this.currentAppTheme = settings.theme;
      // This ensures header appearance updates when app theme changes
      this.updateHeaderType();
    });

    // Initial check
    this.updateHeaderType();

    this.logDevInfo();
  }

  ngOnDestroy() {
    this.routerSubscription?.unsubscribe();
    this.themeSubscription?.unsubscribe();
  }

  get showSearchBar(): boolean {
    return this.router.url !== `/${APP_ROUTES_ENUM.SEARCH}`;
  }

  logoClicked() {
    this.recordHandler.navigateToEmptySearch();
  }

  updateHeaderType() {
    if (this.showSearchBar) {
      this.headerType = 'light';
    } else {
      this.headerType = 'transparent';
    }
  }

  get inputTheme(): string {
    // If header is transparent, the input theme should be based on the app theme
    if (this.headerType === 'transparent') {
      return this.currentAppTheme === AppSettingsThemeEnum.DARK ? 'light' : 'dark';
    }

    // If header is light, use dark input theme regardless of app theme
    return 'dark';
  }


  openSettings() {
    this.settingsService.openSettingsDialog();
  }

  openAdvancedSearch() {
    this.advancedSearch.openDialog();
  }

  login() {
    const currentUrl = this.router.url;
    this.store.dispatch(AuthActions.login({ returnUrl: currentUrl }));
  }

  logDevInfo(): void {
    const devInfo = {
      useStaticRuntimeConfig: this.envService.get('useStaticRuntimeConfig'),
      devMode: this.envService.get('devMode'),
      environmentCode: this.envService.get('environmentCode'),
      environmentName: this.envService.get('environmentName'),

      krameriusBaseUrl: this.envService.get('krameriusBaseUrl'),

      gitCommitHash: this.envService.get('git_commit_hash'),
      gitTag: this.envService.get('git_tag'),
      buildDate: this.envService.get('build_date'),
      gitCommitUrl: undefined as string | undefined,
    };
    if (devInfo.gitCommitHash) {
      const commitUrl = 'https://github.com/trineracz/CDK-klient/commit/' + devInfo.gitCommitHash;
      devInfo.gitCommitUrl = commitUrl;
      console.log('Git commit URL:', commitUrl);
    } else {
      delete devInfo.gitCommitHash;
    }
    console.log('Dev Info:', devInfo);
  }
}
