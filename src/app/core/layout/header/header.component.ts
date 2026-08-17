import { Component, OnInit, OnDestroy, Injector, ChangeDetectorRef, signal, inject, effect } from '@angular/core';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { Subscription, filter, take } from 'rxjs';
import { selectFoldersCount } from '../../../modules/saved-lists-page/state';
import { LoginPromptDialogComponent } from '../../../shared/dialogs/login-prompt-dialog/login-prompt-dialog.component';
import { BreakpointService } from '../../../shared/services/breakpoint.service';
import { DontShowAgainService, DontShowDialogs } from '../../../shared/services/dont-show-again.service';
import { APP_ROUTES_ENUM } from '../../../app.routes';
import { HeaderType } from './header-types';
import { SettingsService } from '../../../modules/settings/settings.service';
import { AuthService } from '../../auth/auth.service';
import { AppSettingsThemeEnum } from '../../../modules/settings/settings.model';
import { NgClass, NgIf } from '@angular/common';
import { AutocompleteComponent } from '../../../shared/components/autocomplete/autocomplete.component';
import { LangPickerComponent } from '../../../shared/translation/lang-picker/lang-picker.component';
import { SearchService } from '../../../shared/services/search.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AdvancedSearchService } from '../../../shared/services/advanced-search.service';
import { EnvironmentService } from '../../../shared/services/environment.service';
import { RecordHandlerService } from '../../../shared/services/record-handler.service';
import { UserInfoComponent } from '../../auth/user-info/user-info.component';
import { customDefinedFacetsEnum } from '../../../modules/search-results-page/const/facets';
import { DocumentTypeEnum } from '../../../modules/constants/document-type';
import { CollectionsService } from '../../../shared/services/collections.service';
import { ClickOutsideDirective } from '../../../shared/directives';
import { CdkTooltipDirective } from '../../../shared/directives/cdk-tooltip/cdk-tooltip.directive';
import { ConfigService } from '../../config';
import { LibraryContextService } from '../../../shared/services/library-context.service';
import { SearchPlaceholderService } from '../../../shared/services/search-placeholder.service';
import { UiStateService } from '../../../shared/services/ui-state.service';
import { AppTranslationService } from '../../../shared/translation/app-translation.service';
import { PageConfig } from '../../config/config.interfaces';
import { isViewerRoutePath } from '../../../shared/constants/viewer-routes';
import { LocalizedPipe } from '../../../shared/pipes/localized.pipe';
import { LocalizedLabel } from '../../config/config.interfaces';

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
    CdkTooltipDirective,
    RouterLink,
    LocalizedPipe,
  ],
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit, OnDestroy {
  headerType: HeaderType = 'transparent';
  private routerSubscription?: Subscription;
  private themeSubscription?: Subscription;
  private authSubscription?: Subscription;

  // Track the application's effective theme correctly considering system overrides
  effectiveTheme: 'light' | 'dark' = 'light';

  // Dynamic header branding
  headerLogo: string = '/favicon.svg';
  headerLogoDark: string = '/favicon-dark.svg';

  /** Localized library name from config (local config or registry fallback). */
  get headerName(): string {
    const lang = this.translationService.currentLanguage().code;
    return this.configService.resolveLabel(this.configService.app.name, lang, '');
  }

  // Mobile menu state
  isMobileMenuOpen = false;

  // Mobile search state
  isMobileSearchOpen = false;

  // Auth state
  isLoggedIn = signal(false);

  // Logo click counter for libraries easter egg
  private logoClickCount = 0;
  private logoClickTimer: any = null;

  private uiState = inject(UiStateService);
  private store = inject(Store);
  private dialog = inject(MatDialog);
  private breakpointService = inject(BreakpointService);
  private dontShowAgainService = inject(DontShowAgainService);

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
    private translationService: AppTranslationService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private searchPlaceholderService: SearchPlaceholderService,
    private translate: TranslateService,
  ) {
    effect(() => {
      this.uiState.searchHeroVisible(); // track signal
      this.updateHeaderType();
      this.cdr.detectChanges();
    });
  }

  /**
   * Advanced search is always available
   */
  get showAdvancedSearch(): boolean {
    return true;
  }

  get homeLink(): any[] {
    return this.libraryContext.prependLibraryPrefix(['/']);
  }

  get homepageTitle(): LocalizedLabel | undefined { return this.configService.homepageTitle; }

  /** True when the active instance is the default CDK aggregator. */
  get isCdk(): boolean { return this.configService.isCdk(); }

  /** Real URL for the logo anchor so it can be opened in a new tab (ctrl/cmd/middle-click). */
  get homeHref(): string {
    return this.router.serializeUrl(this.router.createUrlTree(this.homeLink));
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

        // Clear the search input when drilling into an item viewer so the
        // search box doesn't carry a stale term into the viewer page.
        if (isViewerRoutePath(this.router.url.split('?')[0], this.libraryContext.getLibraryPrefix())) {
          this.searchService.searchTerm.set('');
        }
      });

    // Subscribe to actual active theme considering system level preference
    this.themeSubscription = this.settingsService.effectiveTheme$.subscribe(theme => {
      this.effectiveTheme = theme;
      // This ensures header appearance updates when app theme changes
      this.updateHeaderType();
      this.cdr.detectChanges();
    });

    // Subscribe to auth state
    this.authSubscription = this.authService.isAuthenticated$.subscribe(isAuth => {
      this.isLoggedIn.set(isAuth);
    });

    // Initial check
    this.updateHeaderType();

    // Library branding (name + logo). Always sourced from the resolved config:
    // app.name/app.logo hold the right values whether they came from the
    // library's own local config or — for a switched-to library without one —
    // from the central registry (see ConfigService.buildRegistryFallbackConfig).
    // CDK keeps its own bundled logo regardless.
    if (this.configService.isCdk()) {
      this.headerLogo = 'img/logo.svg';
      this.headerLogoDark = 'img/logo-darkmode.svg';
    } else {
      const logo = this.configService.app.logo;
      this.headerLogo = logo || '/favicon.svg';
      this.headerLogoDark = logo || '/favicon-dark.svg';
    }

    this.logDevInfo();
  }

  ngOnDestroy() {
    this.routerSubscription?.unsubscribe();
    this.themeSubscription?.unsubscribe();
    this.authSubscription?.unsubscribe();
  }

  get showSearchBar(): boolean {
    // Use router.url but strip query params to avoid header changes when dialogs add URL params
    const urlWithoutParams = this.router.url.split('?')[0];
    const isSearchHomePage = urlWithoutParams === '/' || urlWithoutParams === this.libraryContext.getLibraryPrefix();
    if (isSearchHomePage) {
      // On the search home page, only show the header search bar when the hero is scrolled out of view
      return !this.uiState.searchHeroVisible();
    }
    return true;
  }

  get isSearchHomeScrolled(): boolean {
    const urlWithoutParams = this.router.url.split('?')[0];
    const isSearchHomePage = urlWithoutParams === '/' || urlWithoutParams === this.libraryContext.getLibraryPrefix();
    return isSearchHomePage && !this.uiState.searchHeroVisible();
  }

  get isSearchResultsPage(): boolean {
    const urlWithoutParams = this.router.url.split('?')[0];
    return urlWithoutParams.endsWith(`/${APP_ROUTES_ENUM.SEARCH_RESULTS}`);
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

  /**
   * Placeholder for the header search input.
   *
   * Collections keep their own static text; everywhere else the placeholder
   * reflects the currently active filters (see SearchPlaceholderService), so it
   * reads "Hledat v celé digitální knihovně" with no filters and
   * "Hledat s filtry Veřejné, Hudebniny, ..." once filters are applied.
   */
  get autocompletePlaceholder(): string {
    return this.isOnCollectionRoute
      ? this.translate.instant('search-in-collection-placeholder')
      : this.searchPlaceholderService.placeholder();
  }

  onLogoLoad(img: HTMLImageElement) {
    const logoEl = img.closest('.logo') as HTMLElement | null;
    if (logoEl && img.offsetWidth) {
      logoEl.style.setProperty('--logo-rendered-width', `${img.offsetWidth}px`);
    }
  }

  logoClicked(event?: MouseEvent) {
    // Let modifier/middle clicks fall through so the browser opens the href in a new tab.
    if (event && (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0)) {
      return;
    }
    // Plain left-click: keep the custom debounced navigation / easter-egg behavior.
    event?.preventDefault();

    this.logoClickCount++;

    if (this.logoClickTimer) {
      clearTimeout(this.logoClickTimer);
      this.logoClickTimer = null;
    }

    // The libraries page is part of the internal-only library switch.
    // Only reachable via this easter egg when the switch is enabled.
    if (this.logoClickCount >= 5 && this.envService.isLibrarySwitchEnabled()) {
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
    // If header is transparent, the input theme should be based on the app effective theme
    if (this.headerType === 'transparent') {
      return this.effectiveTheme === 'dark' ? 'light' : 'dark';
    }

    // If header is light, use dark input theme regardless of app theme
    return 'dark';
  }


  openSettings() {
    this.settingsService.openSettingsDialog();
  }

  openSavedLists() {
    if (this.isLoggedIn()) {
      this.router.navigate(this.libraryContext.prependLibraryPrefix([`/${APP_ROUTES_ENUM.SAVED_LISTS}`]));
      return;
    }

    // If the user previously chose "don't show again", skip straight to login
    if (!this.dontShowAgainService.shouldShowDialog(DontShowDialogs.FavoritesLoginDialog)) {
      this.goToLogin();
      return;
    }

    const isMobileOrTablet = this.breakpointService.isMobile() || this.breakpointService.isTablet();
    const dialogRef = this.dialog.open(LoginPromptDialogComponent, {
      data: { dontShowDialogId: DontShowDialogs.FavoritesLoginDialog },
      width: isMobileOrTablet ? '90vw' : '60vw',
      panelClass: 'simple-dialog-panel',
      disableClose: false,
    });

    dialogRef.afterClosed().pipe(take(1)).subscribe(result => {
      if (result === 'login') {
        this.goToLogin();
      }
    });
  }

  private goToLogin() {
    const returnUrl = this.router.url;
    this.router.navigate(['pages/terms'], { queryParams: { returnUrl } });
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

  get navPages(): PageConfig[] {
    return this.configService.navPages;
  }

  getPageLabel(page: PageConfig): string {
    const lang = this.translationService.currentLanguage().code;
    const fallbackLang = this.configService.i18n.fallbackLanguage ?? 'en';
    return page.label?.[lang] ?? page.label?.[fallbackLang] ?? page.id;
  }

  getPageLink(page: PageConfig): any[] {
    return this.libraryContext.prependLibraryPrefix(['/pages', page.id]);
  }

  logDevInfo(): void {
    const devInfo = {
      useStaticRuntimeConfig: this.envService.get('useStaticRuntimeConfig'),
      devMode: this.envService.get('devMode'),
      environmentCode: this.envService.get('environmentCode'),
      environmentName: this.envService.get('environmentName'),

      krameriusId: this.envService.getKrameriusId(),
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
