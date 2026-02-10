import { Component, OnInit, OnDestroy, Injector } from '@angular/core';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { APP_ROUTES_ENUM } from '../../../app.routes';
import { HeaderType } from './header-types';
import { SettingsService } from '../../../modules/settings/settings.service';
import { AppSettingsThemeEnum } from '../../../modules/settings/settings.model';
import { NgClass, NgIf } from '@angular/common';
import { AutocompleteComponent } from '../../../shared/components/autocomplete/autocomplete.component';
import { LangPickerComponent } from '../../../shared/translation/lang-picker/lang-picker.component';
import { SearchService } from '../../../shared/services/search.service';
import { TranslatePipe } from '@ngx-translate/core';
import { AdvancedSearchService } from '../../../shared/services/advanced-search.service';
import { EnvironmentService } from '../../../shared/services/environment.service';
import { RecordHandlerService } from '../../../shared/services/record-handler.service';
import { UserInfoComponent } from '../../auth/user-info/user-info.component';
import { customDefinedFacetsEnum } from '../../../modules/search-results-page/const/facets';
import { DocumentTypeEnum } from '../../../modules/constants/document-type';
import { CollectionsService } from '../../../shared/services/collections.service';
import { ClickOutsideDirective } from '../../../shared/directives';
import { ConfigService } from '../../config';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  imports: [
    NgClass,
    NgIf,
    AutocompleteComponent,
    LangPickerComponent,
    TranslatePipe,
    UserInfoComponent,
    ClickOutsideDirective,
    RouterLink,
  ],
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit, OnDestroy {
  headerType: HeaderType = 'transparent';
  private routerSubscription?: Subscription;
  private themeSubscription?: Subscription;

  // Track the application's current theme
  currentAppTheme: AppSettingsThemeEnum = AppSettingsThemeEnum.LIGHT;

  // Mobile menu state
  isMobileMenuOpen = false;

  // Mobile search state
  isMobileSearchOpen = false;

  constructor(
    private envService: EnvironmentService,
    private router: Router,
    private settingsService: SettingsService,
    public searchService: SearchService,
    private advancedSearch: AdvancedSearchService,
    private recordHandler: RecordHandlerService,
    private injector: Injector,
    private configService: ConfigService,
  ) { }

  /**
   * Check if advanced search button should be shown based on config
   */
  get showAdvancedSearch(): boolean {
    return this.configService.isFeatureEnabled('advancedSearch');
  }

  ngOnInit() {
    // Listen for route changes to update header type
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateHeaderType();
        this.isMobileMenuOpen = false; // Close mobile menu on route change
        this.isMobileSearchOpen = false; // Close mobile search on route change
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
    // Use router.url but strip query params to avoid header changes when dialogs add URL params
    const urlWithoutParams = this.router.url.split('?')[0];
    return urlWithoutParams !== `/${APP_ROUTES_ENUM.SEARCH}`;
  }

  get isOnCollectionRoute(): boolean {
    return this.router.url.includes(`/${APP_ROUTES_ENUM.COLLECTION}/`);
  }

  get autocompleteService() {
    if (this.isOnCollectionRoute) {
      try {
        const collectionsService = this.injector.get(CollectionsService, null);
        if (collectionsService) {
          return collectionsService;
        }
      } catch (e) {
        // CollectionsService not available, fall back to searchService
      }
    }
    return this.searchService;
  }

  get autocompletePlaceholder(): string {
    return this.isOnCollectionRoute ? 'search-in-collection-placeholder' : 'search-input-placeholder';
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

  goToCollections() {
    this.searchService.searchWithFacet(`${customDefinedFacetsEnum.model}`, DocumentTypeEnum.collection, true);
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu() {
    if (this.isMobileMenuOpen) {
      setTimeout(() => this.isMobileMenuOpen = false, 25);
    }
  }

  toggleMobileSearch() {
    this.isMobileSearchOpen = !this.isMobileSearchOpen;
  }

  closeMobileSearch() {
    this.isMobileSearchOpen = false;
  }

  logDevInfo(): void {
    const devInfo = {
      useStaticRuntimeConfig: this.envService.get('useStaticRuntimeConfig'),
      devMode: this.envService.get('devMode'),
      environmentCode: this.envService.get('environmentCode'),
      environmentName: this.envService.get('environmentName'),

      krameriusId: this.envService.get('krameriusId'),
      krameriusBaseUrl: this.envService.getKrameriusUrl(),

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

  protected readonly AppSettingsThemeEnum = AppSettingsThemeEnum;
  protected readonly APP_ROUTES_ENUM = APP_ROUTES_ENUM;
  protected readonly customDefinedFacetsEnum = customDefinedFacetsEnum;
  protected readonly DocumentTypeEnum = DocumentTypeEnum;
}
