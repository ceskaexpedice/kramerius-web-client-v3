import { Injectable } from '@angular/core';
import { LANG_FALLBACK_CHAIN, DEFAULT_LANG_FALLBACK } from '../../shared/translation/translation-fallback-chain';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  AppConfiguration,
  FeaturesConfig,
  ViewerConfig,
  ViewerControlsConfig,
  SelectionControlsConfig,
  LicensesConfig,
  LicenseAccessType,
  LicenseBarConfig,
  I18nConfig,
  UiConfig,
  ViewerMode,
  AppConfig,
  ApiConfig,
  IntegrationsConfig,
  HomepageSectionConfig,
  PageConfig,
  SuggestedSearchTagItem,
  LocalizedLabel
} from './config.interfaces';
import { DEFAULT_CONFIG, DEFAULT_HOME_SECTIONS } from './config.defaults';
import { EnvironmentService } from '../../shared/services/environment.service';

const LIBRARIES_API_URL = 'https://api.registr.digitalniknihovna.cz/api/libraries';

// Libraries not in the central registry but available as dev/testing instances.
export const EXTRA_LIBRARY_REGISTRY: Record<string, { code: string; name: string; name_en: string; logo: string; url: string }> = {
  'inovatika-k7': {
    code: 'inovatika-k7',
    name: 'Inovatika K7 (dev)',
    name_en: 'Inovatika K7 (dev)',
    logo: '',
    url: 'https://k7.inovatika.dev/',
  },
  'trinera-k7': {
    code: 'trinera-k7',
    name: 'Trinera K7 (dev)',
    name_en: 'Trinera K7 (dev)',
    logo: '/img/logo/logo-trinera-symbol.png',
    url: 'https://kramerius.k7.trinera.cloud',
  },
};

@Injectable({ providedIn: 'root' })
export class ConfigService {
  constructor(private envService: EnvironmentService) {}

  private configUrlFor(code: string) { return `local-config/${code}/config-main.json`; }
  private licensesUrlFor(code: string) { return `local-config/${code}/config-licenses.json`; }
  private homeSectionsUrlFor(code: string) { return `local-config/${code}/config-homepage.json`; }

  /**
   * Returns the URL to fetch libraries.json from.
   * On localhost uses local file, on production uses the remote API.
   */
  static getLibrariesUrl(): string {
    return LIBRARIES_API_URL;
  }

  static getLibraryByCodeUrl(code: string): string {
    return `${LIBRARIES_API_URL}/${code}`;
  }
  private config$ = new BehaviorSubject<AppConfiguration | null>(null);
  private loaded = false;

  /**
   * Load configuration from JSON files.
   * Should be called via APP_INITIALIZER.
   */
  async load(): Promise<void> {
    if (this.loaded) return;

    const code = this.envService.getKrameriusId();
    const timestamp = Date.now();

    try {
      const configResponse = await fetch(`${this.configUrlFor(code)}?t=${timestamp}`);
      if (!configResponse.ok) throw new Error('Config load failed');
      const configData = await configResponse.json();

      const [licensesResponse, homeSectionsResponse] = await Promise.all([
        fetch(`${this.licensesUrlFor(code)}?t=${timestamp}`),
        fetch(`${this.homeSectionsUrlFor(code)}?t=${timestamp}`)
      ]);

      const licensesData = await this.safeParseJson(licensesResponse, 'config-licenses.json');
      const homeSectionsRaw: any = await this.safeParseJson(homeSectionsResponse, 'config-homepage.json');

      const processedLicenses = licensesData ? this.processLicensesWithDefaults(licensesData) : DEFAULT_CONFIG.licenses;

      // Handle homepage config: object with sections key or legacy array
      let homeSectionsData: HomepageSectionConfig[] | null = null;
      let homepageTitle: LocalizedLabel | undefined;
      let homepageSubtitle: LocalizedLabel | undefined;
      if (Array.isArray(homeSectionsRaw)) {
        homeSectionsData = homeSectionsRaw;
      } else if (homeSectionsRaw?.sections) {
        homeSectionsData = homeSectionsRaw.sections;
        homepageTitle = homeSectionsRaw.title ?? undefined;
        homepageSubtitle = homeSectionsRaw.subtitle ?? undefined;
      }

      const homeSections = homeSectionsData?.filter(s => s.visible !== false) ?? DEFAULT_HOME_SECTIONS;

      const mergedConfig = this.mergeWithDefaults({ ...configData, licenses: processedLicenses, homeSections, homepageTitle, homepageSubtitle });
      this.config$.next(mergedConfig);
      this.loaded = true;
      console.log(`ConfigService: Configuration loaded for library '${code}'.`);
    } catch (err) {
      console.warn('ConfigService: Configuration not found or invalid. Using default configuration.', err);
      this.config$.next(DEFAULT_CONFIG);
      this.loaded = true;
    }
  }

  private async safeParseJson(response: Response, fileName: string): Promise<any | null> {
    if (!response.ok) return null;
    try {
      return await response.json();
    } catch (err) {
      console.warn(`ConfigService: Failed to parse ${fileName}. Using defaults.`, err);
      return null;
    }
  }

  /**
   * Process licenses config by merging each license with _defaults
   */
  private processLicensesWithDefaults(licensesData: Record<string, any>): LicensesConfig {
    const { _defaults, licenses } = licensesData;
    const defaultActions = _defaults?.actions ?? {};

    const licenseArray: any[] = Array.isArray(licenses)
      ? licenses
      : Object.entries(licenses ?? {}).map(([id, v]) => ({ id, ...(v as any) }));

    return licenseArray.map(lic => ({
      ...lic,
      isOnline: lic.accessType !== 'terminal',
      actions: { ...defaultActions, ...lic.actions }
    }));
  }

  /**
   * Deep merge loaded config with defaults
   */
  private mergeWithDefaults(loaded: Partial<AppConfiguration>): AppConfiguration {
    return {
      app: loaded.app ?? DEFAULT_CONFIG.app,
      api: loaded.api ?? DEFAULT_CONFIG.api,
      i18n: loaded.i18n ?? DEFAULT_CONFIG.i18n,
      integrations: loaded.integrations,
      features: loaded.features ?? DEFAULT_CONFIG.features,
      ui: loaded.ui ?? DEFAULT_CONFIG.ui,
      viewer: loaded.viewer ?? DEFAULT_CONFIG.viewer,
      search: loaded.search,
      licenses: loaded.licenses ?? DEFAULT_CONFIG.licenses,
      pages: loaded.pages ?? [],
      homeSections: loaded.homeSections ?? DEFAULT_HOME_SECTIONS,
      homepageTitle: loaded.homepageTitle,
      homepageSubtitle: loaded.homepageSubtitle
    };
  }

  /**
   * Get the full configuration object
   */
  getConfig(): AppConfiguration {
    return this.config$.value ?? DEFAULT_CONFIG;
  }

  /**
   * Observable of the configuration
   */
  get config(): Observable<AppConfiguration> {
    return this.config$.asObservable().pipe(
      map(c => c ?? DEFAULT_CONFIG)
    );
  }

  // App config accessors
  get app(): AppConfig {
    return this.getConfig().app;
  }

  // API config accessors
  get api(): ApiConfig {
    return this.getConfig().api;
  }

  // Integrations config accessors
  get integrations(): IntegrationsConfig | undefined {
    return this.getConfig().integrations;
  }

  // Feature flags accessors
  get features(): FeaturesConfig {
    return this.getConfig().features;
  }

  isFeatureEnabled(feature: keyof FeaturesConfig): boolean {
    return this.features[feature] ?? false;
  }

  // UI config accessors
  get ui(): UiConfig {
    return this.getConfig().ui;
  }

  // Viewer config accessors
  get viewer(): ViewerConfig {
    return this.getConfig().viewer;
  }

  isViewerModeAvailable(mode: ViewerMode): boolean {
    return this.viewer.availableModes.includes(mode);
  }

  /**
   * Check if a viewer control is enabled
   */
  isViewerControlEnabled(control: keyof ViewerControlsConfig): boolean {
    return this.viewer.controls?.[control] ?? true;
  }

  /**
   * Check if a selection control is enabled
   */
  isSelectionControlEnabled(control: keyof SelectionControlsConfig): boolean {
    return this.viewer.selectionControls?.[control] ?? true;
  }

  /**
   * Get viewer controls config
   */
  get viewerControls(): ViewerControlsConfig {
    return this.viewer.controls ?? DEFAULT_CONFIG.viewer.controls!;
  }

  /**
   * Get selection controls config
   */
  get selectionControls(): SelectionControlsConfig {
    return this.viewer.selectionControls ?? DEFAULT_CONFIG.viewer.selectionControls!;
  }

  // i18n config accessors
  get i18n(): I18nConfig {
    return this.getConfig().i18n;
  }

  // License config accessors
  get licenses(): LicensesConfig {
    return this.getConfig().licenses;
  }

  /**
   * Get licenses by access type
   */
  getLicensesByAccessType(accessType: LicenseAccessType): string[] {
    return this.licenses.filter(l => l.accessType === accessType).map(l => l.id);
  }

  /**
   * Get open licenses (accessType: 'open')
   */
  getOpenLicenses(): string[] {
    return this.getLicensesByAccessType('open');
  }

  /**
   * Get terminal licenses (accessType: 'terminal')
   */
  getTerminalLicenses(): string[] {
    return this.getLicensesByAccessType('terminal');
  }

  /**
   * Get after-login licenses (accessType: 'login')
   */
  getAfterLoginLicenses(): string[] {
    return this.getLicensesByAccessType('login');
  }

  /**
   * Get online licenses (isOnline: true)
   * Online means accessible remotely (not requiring physical presence)
   */
  getOnlineLicenses(): string[] {
    return this.licenses.filter(l => l.isOnline).map(l => l.id);
  }

  /**
   * Get ordered list of license IDs based on their position in config
   */
  getLicenseOrder(): string[] {
    return this.licenses.map(l => l.id);
  }

  /**
   * Get a specific license configuration
   */
  getLicenseConfig(licenseId: string) {
    return this.licenses.find(l => l.id === licenseId);
  }

  /**
   * Get all license bar configurations defined across licenses.
   */
  getLicenseBars(): LicenseBarConfig[] {
    return this.licenses.filter(l => l.bar).map(l => l.bar!);
  }

  /**
   * Returns an ordered list of languages to try for a given lang: [lang, ...chain, fallbackLang].
   */
  private getLangChain(lang: string): string[] {
    const fallbackLang = this.i18n.fallbackLanguage ?? 'en';
    const chain = LANG_FALLBACK_CHAIN[lang] ?? DEFAULT_LANG_FALLBACK;
    const result = [lang, ...chain];
    if (!result.includes(fallbackLang)) result.push(fallbackLang);
    return result;
  }

  /**
   * Get localized label from config for any entity type.
   * Supports: 'license' (more types can be added in future)
   * Falls back to: requested lang -> fallback chain -> key itself
   */
  getLocalizedLabel(type: 'license', key: string, lang: string): string {
    switch (type) {
      case 'license': {
        const license = this.licenses.find(l => l.id === key);
        if (!license?.label) return key;
        for (const l of this.getLangChain(lang)) {
          if (license.label[l]) return license.label[l];
        }
        return key;
      }
      default:
        return key;
    }
  }

  /**
   * Get the URL for a specific message page by license ID, page key, and language.
   * Falls back through the language chain if the requested language is not available.
   */
  getMessagePageUrl(licenseId: string, pageKey: string, lang: string): string | null {
    const license = this.licenses.find(l => l.id === licenseId);
    if (!license?.messagePages) return null;

    const messagePage = license.messagePages.find(mp => mp.key === pageKey);
    if (!messagePage) return null;

    for (const l of this.getLangChain(lang)) {
      if (messagePage.page[l]) return messagePage.page[l];
    }
    return null;
  }

  /**
   * Get the URL for the instruction page by license ID and language.
   * Falls back through the language chain if the requested language is not available.
   */
  getInstructionPageUrl(licenseId: string, lang: string): string | null {
    const license = this.licenses.find(l => l.id === licenseId);
    if (!license?.instructionPage) return null;

    for (const l of this.getLangChain(lang)) {
      if (license.instructionPage[l]) return license.instructionPage[l];
    }
    return null;
  }

  /**
   * Fetch HTML content from a relative URL path.
   * Uses timestamp cache-busting to avoid stale content.
   */
  async loadHtmlContent(url: string): Promise<string> {
    try {
      const timestamp = Date.now();
      const response = await fetch(`${url}?t=${timestamp}`);
      if (!response.ok) return '';
      const buffer = await response.arrayBuffer();
      return new TextDecoder('utf-8').decode(buffer);
    } catch (err) {
      console.warn(`ConfigService: Failed to load HTML content from ${url}.`, err);
      return '';
    }
  }

  // Pages accessors
  get pages(): PageConfig[] {
    return this.getConfig().pages ?? [];
  }

  get navPages(): PageConfig[] {
    return this.pages.filter(p => p.showInHeader && !!p.label);
  }

  getPage(id: string): PageConfig | undefined {
    return this.pages.find(p => p.id === id);
  }

  /**
   * Get the resolved content URL for a page by ID and language.
   * Returns the first URL if content is an array, or the single URL string.
   * Falls back to fallback language if the requested language is not available.
   */
  getPageContentUrl(pageId: string, lang: string): string | null {
    const urls = this.getPageContentUrls(pageId, lang);
    return urls[0] ?? null;
  }

  getPageContentUrls(pageId: string, lang: string): string[] {
    const page = this.getPage(pageId);
    if (!page) return [];

    for (const l of this.getLangChain(lang)) {
      const rawContent = page.content[l];
      if (rawContent) return Array.isArray(rawContent) ? rawContent : [rawContent];
    }
    return [];
  }

  // Suggested tags accessor (from homepage config 'suggested-tags' section)
  get suggestedTags(): SuggestedSearchTagItem[] {
    const section = this.homeSections.find(s => s.type === 'suggested-tags');
    return section?.tags ?? [];
  }

  // Home sections accessors
  get homeSections(): HomepageSectionConfig[] {
    return this.getConfig().homeSections ?? DEFAULT_HOME_SECTIONS;
  }

  get homepageTitle(): LocalizedLabel | undefined {
    return this.getConfig().homepageTitle;
  }

  get homepageSubtitle(): LocalizedLabel | undefined {
    return this.getConfig().homepageSubtitle;
  }

  // Active library accessor (for dynamic header branding)
  private activeLibraryCache: { code: string; name: string; name_en: string; logo: string } | null = null;

  async getActiveLibrary(): Promise<{ name: string; name_en: string; logo: string } | null> {
    if (!this.isFeatureEnabled('librarySwitch')) return null;

    const activeCode = localStorage.getItem('CDK_DEV_KRAMERIUS_ID');
    if (!activeCode) return null;

    if (!this.activeLibraryCache || this.activeLibraryCache.code !== activeCode) {
      try {
        const response = await fetch(ConfigService.getLibraryByCodeUrl(activeCode));
        if (response.ok) {
          this.activeLibraryCache = await response.json();
        } else {
          const extra = EXTRA_LIBRARY_REGISTRY[activeCode];
          if (extra) {
            this.activeLibraryCache = extra;
          } else {
            return null;
          }
        }
      } catch {
        const extra = EXTRA_LIBRARY_REGISTRY[activeCode];
        if (extra) {
          this.activeLibraryCache = extra;
        } else {
          return null;
        }
      }
    }

    if (!this.activeLibraryCache) return null;
    return { name: this.activeLibraryCache.name, name_en: this.activeLibraryCache.name_en, logo: this.activeLibraryCache.logo };
  }
}
