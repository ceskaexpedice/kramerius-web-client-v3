import { Injectable } from '@angular/core';
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
  I18nConfig,
  UiConfig,
  ViewerMode,
  AppConfig,
  ApiConfig,
  IntegrationsConfig,
  HomepageSectionConfig
} from './config.interfaces';
import { DEFAULT_CONFIG, DEFAULT_HOME_SECTIONS } from './config.defaults';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private configUrl = 'local-config/config-main.json';
  private licensesUrl = 'local-config/config-licenses.json';
  private homeSectionsUrl = 'local-config/config-homepage.json';
  private config$ = new BehaviorSubject<AppConfiguration | null>(null);
  private loaded = false;

  /**
   * Load configuration from JSON files.
   * Should be called via APP_INITIALIZER.
   */
  async load(): Promise<void> {
    if (this.loaded) return;

    try {
      const timestamp = Date.now();
      const [configResponse, licensesResponse, homeSectionsResponse] = await Promise.all([
        fetch(`${this.configUrl}?t=${timestamp}`),
        fetch(`${this.licensesUrl}?t=${timestamp}`),
        fetch(`${this.homeSectionsUrl}?t=${timestamp}`)
      ]);

      if (!configResponse.ok) throw new Error('Config load failed');

      const configData = await configResponse.json();
      const licensesData = await this.safeParseJson(licensesResponse, 'config-licenses.json');
      const homeSectionsData: HomepageSectionConfig[] | null = await this.safeParseJson(homeSectionsResponse, 'config-homepage.json');

      // Process licenses with _defaults pattern
      const processedLicenses = licensesData ? this.processLicensesWithDefaults(licensesData) : DEFAULT_CONFIG.licenses;

      // Filter out invisible sections
      const homeSections = homeSectionsData?.filter(s => s.visible !== false) ?? DEFAULT_HOME_SECTIONS;

      // Deep merge with defaults to ensure all required fields exist
      const mergedConfig = this.mergeWithDefaults({ ...configData, licenses: processedLicenses, homeSections });
      this.config$.next(mergedConfig);
      this.loaded = true;
      console.log('ConfigService: Configuration loaded successfully');
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
    const { _defaults, ...licenses } = licensesData;
    const defaultActions = _defaults?.actions ?? {};

    const processed: LicensesConfig = {};
    for (const [id, license] of Object.entries(licenses)) {
      const lic = license as any;
      processed[id] = {
        id,
        ...lic,
        isOnline: lic.isOnline ?? false,
        actions: { ...defaultActions, ...lic.actions }
      };
    }
    return processed;
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
      contentPages: loaded.contentPages,
      homeSections: loaded.homeSections ?? DEFAULT_HOME_SECTIONS
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
    return Object.entries(this.licenses)
      .filter(([_, config]) => config.accessType === accessType)
      .map(([id]) => id);
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
    return Object.entries(this.licenses)
      .filter(([_, config]) => config.isOnline)
      .map(([id]) => id);
  }

  /**
   * Get ordered list of license IDs based on their position in config
   */
  getLicenseOrder(): string[] {
    return Object.keys(this.licenses);
  }

  /**
   * Get a specific license configuration
   */
  getLicenseConfig(licenseId: string) {
    return this.licenses[licenseId];
  }

  /**
   * Get localized label from config for any entity type.
   * Supports: 'license' (more types can be added in future)
   * Falls back to: requested lang -> fallback lang -> key itself
   */
  getLocalizedLabel(type: 'license', key: string, lang: string): string {
    const fallbackLang = this.i18n.fallbackLanguage ?? 'en';

    switch (type) {
      case 'license': {
        const license = this.licenses[key];
        if (!license?.label) return key;
        return license.label[lang] ?? license.label[fallbackLang] ?? key;
      }
      default:
        return key;
    }
  }

  /**
   * Get the URL for a specific message page by license ID, page key, and language.
   * Falls back to fallback language if the requested language is not available.
   */
  getMessagePageUrl(licenseId: string, pageKey: string, lang: string): string | null {
    const license = this.licenses[licenseId];
    if (!license?.messagePages) return null;

    const messagePage = license.messagePages.find(mp => mp.key === pageKey);
    if (!messagePage) return null;

    const fallbackLang = this.i18n.fallbackLanguage ?? 'en';
    return messagePage.page[lang] ?? messagePage.page[fallbackLang] ?? null;
  }

  /**
   * Get the URL for the instruction page by license ID and language.
   * Falls back to fallback language if the requested language is not available.
   */
  getInstructionPageUrl(licenseId: string, lang: string): string | null {
    const license = this.licenses[licenseId];
    if (!license?.instructionPage) return null;

    const fallbackLang = this.i18n.fallbackLanguage ?? 'en';
    return license.instructionPage[lang] ?? license.instructionPage[fallbackLang] ?? null;
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

  // Home sections accessors
  get homeSections(): HomepageSectionConfig[] {
    return this.getConfig().homeSections ?? DEFAULT_HOME_SECTIONS;
  }
}
