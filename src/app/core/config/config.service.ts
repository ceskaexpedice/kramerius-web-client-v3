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
  LicenseWatermarkConfig,
  I18nConfig,
  UiConfig,
  ExportConfig,
  ExportFormat,
  ViewerMode,
  AppConfig,
  ApiConfig,
  IntegrationsConfig,
  HomepageSectionConfig,
  PageConfig,
  SuggestedSearchTagItem,
  LocalizedLabel,
  FooterConfig
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
  'cdk-dev': {
    code: 'cdk-dev',
    name: 'CDK (dev)',
    name_en: 'CDK (dev)',
    logo: '',
    url: 'https://cdk-api.dev.ceskadigitalniknihovna.cz',
  },
};

@Injectable({ providedIn: 'root' })
export class ConfigService {
  constructor(private envService: EnvironmentService) {}

  /**
   * Returns true when the active instance is the CDK aggregator
   * (Česká digitální knihovna). Enables CDK-specific extended features
   * such as the "cdk.collection" source facet.
   *
   * Driven by the library code in config-main.json (`app.code`), so a
   * standalone library never accidentally enables CDK aggregator features.
   * When the internal library switch is on, the selected dev library id wins.
   */
  isCdk(): boolean {
    if (this.envService.isLibrarySwitchEnabled()) {
      return this.envService.getKrameriusId().includes('cdk');
    }
    return (this.app?.code ?? '').includes('cdk');
  }

  /**
   * Single seam for fetching a config file. Today it reads the flat local-config
   * dir. FUTURE: configs move to an API — the resolver will fetch from the API
   * and, when a local file for the same name exists, the LOCAL file wins as a
   * whole (per-file override, no merge). Keep that switch isolated here.
   */
  private resolveConfigFile(name: 'config-main' | 'config-licenses' | 'config-homepage'): Promise<Response> {
    const timestamp = Date.now();
    return fetch(`local-config/${name}.json?t=${timestamp}`);
  }

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

    // 1. Load the single flat config. It decides whether the internal library
    //    switch is enabled (features.librarySwitch). No env-based folder lookup;
    //    the library code comes from the config itself (app.code).
    const baseConfig = await this.fetchLibraryConfig();
    if (!baseConfig) {
      throw new Error('ConfigService: config-main.json missing or invalid — cannot start.');
    }

    const switchEnabled = baseConfig.features?.librarySwitch ?? false;
    const baseCode = baseConfig.app?.code ?? '';

    // 2. Default path: switch off → use the flat config as-is. Nothing is read
    //    from localStorage or the registry.
    if (!switchEnabled) {
      this.applyResolvedConfig(baseConfig, baseCode, false);
      return;
    }

    // 3. Switch on (internal dev hack). If a different library was selected in
    //    localStorage, its local config no longer exists (the flat dir holds a
    //    single library), so brand it from the central registry (name/logo) with
    //    DEFAULT homepage sections. Otherwise stay on the base config.
    const selectedCode = localStorage.getItem('CDK_DEV_KRAMERIUS_ID');
    if (!selectedCode || selectedCode === baseCode) {
      this.applyResolvedConfig(baseConfig, baseCode, true);
      return;
    }

    const fallback = await this.buildRegistryFallbackConfig(selectedCode);
    this.applyResolvedConfig(fallback, selectedCode, true);
  }

  /**
   * Fetch and merge a single library's config (config-main.json + licenses +
   * homepage). Returns null when the library has no config-main.json.
   */
  private async fetchLibraryConfig(): Promise<AppConfiguration | null> {
    try {
      const configResponse = await this.resolveConfigFile('config-main');
      if (!configResponse.ok) return null;
      const configData = await configResponse.json();

      const [licensesResponse, homeSectionsResponse] = await Promise.all([
        this.resolveConfigFile('config-licenses'),
        this.resolveConfigFile('config-homepage')
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

      return this.mergeWithDefaults({ ...configData, licenses: processedLicenses, homeSections, homepageTitle, homepageSubtitle });
    } catch (err) {
      console.warn(`ConfigService: Failed to load configuration.`, err);
      return null;
    }
  }

  /**
   * Publish a resolved config and push its backend URL + the (base-config-owned)
   * library-switch flag to EnvironmentService. The switch flag comes from the
   * base instance, NOT from the effective config — a switched-to library's
   * config (or registry fallback) must not be able to turn the switch off,
   * otherwise the localStorage backend override would stop being honored.
   */
  private applyResolvedConfig(config: AppConfiguration, code: string, switchEnabled: boolean): void {
    this.config$.next(config);
    this.envService.applyAppConfig(config.api?.baseUrl ?? null, switchEnabled, code);
    this.loaded = true;
    console.log(`ConfigService: Configuration loaded for library '${code}'.`);
  }

  /** Neutral config (no CDK branding) used when no config could be loaded. */
  private buildNeutralConfig(): AppConfiguration {
    return {
      ...DEFAULT_CONFIG,
      app: { ...DEFAULT_CONFIG.app, code: '', name: '' },
      homeSections: DEFAULT_HOME_SECTIONS,
      homepageTitle: undefined,
      homepageSubtitle: undefined
    };
  }

  /**
   * Config for a switched-to library that has no local config dir: generic
   * defaults branded with the library's name/logo from the central registry.
   * Homepage uses DEFAULT_HOME_SECTIONS (there is no config-homepage.json).
   */
  private async buildRegistryFallbackConfig(code: string): Promise<AppConfiguration> {
    const neutral = this.buildNeutralConfig();
    const activeLib = await this.getActiveLibrary();
    if (!activeLib) return neutral;

    return {
      ...neutral,
      app: {
        ...neutral.app,
        code,
        name: { cs: activeLib.name, en: activeLib.name_en || activeLib.name },
        logo: activeLib.logo || neutral.app.logo
      }
    };
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
      export: { ...DEFAULT_CONFIG.export, ...loaded.export },
      viewer: loaded.viewer ?? DEFAULT_CONFIG.viewer,
      search: loaded.search,
      licenses: loaded.licenses ?? DEFAULT_CONFIG.licenses,
      pages: loaded.pages ?? [],
      homeSections: loaded.homeSections ?? DEFAULT_HOME_SECTIONS,
      homepageTitle: loaded.homepageTitle,
      homepageSubtitle: loaded.homepageSubtitle,
      footer: loaded.footer ?? DEFAULT_CONFIG.footer
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

  isFeatureEnabled(feature: Exclude<keyof FeaturesConfig, 'mapProvider'>): boolean {
    return this.features[feature] ?? true;
  }

  // UI config accessors
  get ui(): UiConfig {
    return this.getConfig().ui;
  }

  // Export config accessors
  get export(): ExportConfig {
    return this.getConfig().export ?? DEFAULT_CONFIG.export;
  }

  /**
   * Check whether a document export format (print/jpeg/pdf/epub/txt) is enabled.
   */
  isExportFormatEnabled(format: ExportFormat): boolean {
    return this.export[format] ?? true;
  }

  /**
   * True when at least one export format is enabled. When false, the export
   * tab in the metadata sidebar should be hidden entirely.
   */
  isAnyExportFormatEnabled(): boolean {
    const formats: ExportFormat[] = ['print', 'jpeg', 'pdf', 'epub', 'txt'];
    return formats.some(f => this.export[f]);
  }

  /**
   * Whether the "enrich with AI" toggle is offered in the email export dialog
   * (EPUB/TXT exports). Defaults to true when unset.
   */
  isEnrichWithAIEnabled(): boolean {
    return this.export.enrichWithAI ?? true;
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
   * Returns the watermark config for the first license in the given list
   * that has a watermark defined. Returns null when no match.
   */
  getWatermarkConfig(docLicenses: string[]): LicenseWatermarkConfig | null {
    for (const licId of docLicenses) {
      const lic = this.licenses.find(l => l.id === licId);
      if (lic?.watermark) return lic.watermark;
    }
    return null;
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
   * Resolve a string or LocalizedLabel to a plain string for the given language.
   * Falls back through the configured language chain (e.g. sk → cs → en).
   * If value is already a string, it is returned as-is.
   */
  resolveLabel(value: string | LocalizedLabel | undefined, lang: string, fallback = ''): string {
    if (!value) return fallback;
    if (typeof value === 'string') return value;
    for (const l of this.getLangChain(lang)) {
      if (value[l]) return value[l];
    }
    return Object.values(value)[0] ?? fallback;
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

  // Footer config accessor
  get footer(): FooterConfig {
    return this.getConfig().footer ?? DEFAULT_CONFIG.footer ?? {};
  }

  /**
   * Resolve the footer HTML URL for the given language, walking the language
   * fallback chain (e.g. sk → cs → en). Returns null when no footer is configured.
   */
  getFooterContentUrl(lang: string): string | null {
    const footer = this.footer;
    for (const l of this.getLangChain(lang)) {
      const url = footer[l];
      if (url) return Array.isArray(url) ? url[0] : url;
    }
    return null;
  }

  // Active library accessor (for dynamic header branding)
  private activeLibraryCache: { code: string; name: string; name_en: string; logo: string } | null = null;

  async getActiveLibrary(): Promise<{ name: string; name_en: string; logo: string } | null> {
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
