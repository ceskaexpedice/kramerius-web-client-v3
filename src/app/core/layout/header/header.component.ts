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
import { LibraryContextService } from '../../../shared/services/library-context.service';

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

  // Dynamic header branding
  headerLogo: string = '/favicon.svg';
  headerLogoDark: string = '/favicon-dark.svg';
  headerName: string = '';

  // Mobile menu state
  isMobileMenuOpen = false;

  // Mobile search state
  isMobileSearchOpen = false;

  // Logo click counter for libraries easter egg
  private logoClickCount = 0;
  private logoClickTimer: any = null;

  constructor(
    private envService: EnvironmentService,
    private router: Router,
    private settingsService: SettingsService,
    public searchService: SearchService,
    private advancedSearch: AdvancedSearchService,
    private recordHandler: RecordHandlerService,
    private injector: Injector,
    private configService: ConfigService,
    private libraryContext: LibraryContextService,
  ) { }

  /**
   * Check if advanced search button should be shown based on config
   */
  get showAdvancedSearch(): boolean {
    return this.configService.isFeatureEnabled('advancedSearch');
  }

  get homeLink(): any[] {
    return this.libraryContext.prependLibraryPrefix(['/']);
  }

  get searchLink(): any[] {
    return this.libraryContext.prependLibraryPrefix(['/search']);
  }

  async ngOnInit() {
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

    // Load active library branding
    const activeLib = await this.configService.getActiveLibrary();
    if (activeLib) {
      this.headerLogo = activeLib.logo;
      this.headerLogoDark = activeLib.logo;
      this.headerName = activeLib.name;
    } else {
      this.headerLogo = this.configService.app.logo || '/favicon.svg';
      this.headerLogoDark = '/favicon-dark.svg';
    }

    this.logDevInfo();
  }

  ngOnDestroy() {
    this.routerSubscription?.unsubscribe();
    this.themeSubscription?.unsubscribe();
  }

  get showSearchBar(): boolean {
    // Use router.url but strip query params to avoid header changes when dialogs add URL params
    const urlWithoutParams = this.router.url.split('?')[0];
    return urlWithoutParams !== '/';
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
    this.logoClickCount++;

    if (this.logoClickTimer) {
      clearTimeout(this.logoClickTimer);
      this.logoClickTimer = null;
    }

    if (this.logoClickCount >= 5) {
      this.router.navigate([`/${APP_ROUTES_ENUM.LIBRARIES}`]);

      this.logoClickTimer = setTimeout(() => {
        this.logoClickCount = 0;
        this.logoClickTimer = null;
      }, 1000);
      return;
    }

    this.logoClickTimer = setTimeout(() => {
      this.recordHandler.navigateToEmptySearch();
      this.logoClickCount = 0;
      this.logoClickTimer = null;
    }, 200);
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
