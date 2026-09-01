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
import { CdkSourceService } from '../../shared/services/cdk-source.service';
import { splitLicenseVariants, resolveLicenseForSource } from './license-variants';
import { sanitizeContentHtml } from '../../shared/utils/sanitize-content-html';

const LIBRARIES_API_URL = 'https://api.registr.digitalniknihovna.cz/api/libraries';

// Config file name handled by resolveConfigFile / the /ui-config API.
type ConfigFileName = 'config-main' | 'config-licenses' | 'config-homepage';

// Maps a local config file name to its /ui-config API endpoint. The API
// returns the same shapes the local loader already expects:
//   general       → config-main.json     (app, api, i18n, pages, viewer, ...)
//   licenses      → config-licenses.json  ({ _defaults, licenses: [...] })
//   curator-lists → config-homepage.json  ({ title, subtitle, sections })
const API_CONFIG_ENDPOINTS: Record<ConfigFileName, string> = {
  'config-main': 'general',
  'config-licenses': 'licenses',
  'config-homepage': 'curator-lists',
};

// Libraries not in the central registry but available as dev/testing instances.
export const EXTRA_LIBRARY_REGISTRY: Record<string, { code: string; name: string; name_en: string; logo: string; url: string; alive: boolean }> = {
  'inovatika-k7': {
    code: 'inovatika-k7',
    name: 'Inovatika K7 (dev)',
    name_en: 'Inovatika K7 (dev)',
    logo: '/img/logo/inovatika-logo.png',
    alive: true,
    url: 'https://k7.inovatika.dev/',
  },
  'trinera-k7': {
    code: 'trinera-k7',
    name: 'Trinera K7 (dev)',
    name_en: 'Trinera K7 (dev)',
    logo: '/img/logo/logo-trinera-symbol.png',
    alive: true,
    url: 'https://kramerius.k7.trinera.cloud',
  },
  'cdk-dev': {
    code: 'cdk-dev',
    name: 'CDK (dev)',
    name_en: 'CDK (dev)',
    logo: '/img/logo.svg',
    alive: true,
    url: 'https://cdk-api.dev.ceskadigitalniknihovna.cz',
  },
};

@Injectable({ providedIn: 'root' })
export class ConfigService {
  constructor(
    private envService: EnvironmentService,
    private cdkSource: CdkSourceService,
  ) {}

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
   * Single seam for fetching a config file. Resolution rules:
   *
   *   forceApiConfig on               → API only (local-config skipped entirely)
   *   API enabled  + local file present → local file (overrides API)
   *   API enabled  + no local file      → API
   *   API disabled + local file present → local file
   *   API disabled + no local file      → not found → caller uses defaults /
   *                                        (for config-main) fails to boot
   *
   * API loading is enabled simply by setting apiConfigBaseUrl (no separate
   * on/off flag), so the default deployment — with no base URL — behaves
   * exactly as before (local-config only). forceApiConfig additionally bypasses
   * the local override, for deployments that ship no local-config at all.
   */
  private async resolveConfigFile(name: ConfigFileName): Promise<Response> {
    // Force mode: read only from the API, never touch local-config.
    if (this.isApiConfigForced()) {
      const apiResponse = await this.fetchApiConfig(name);
      // Return a synthetic 404 when the API has nothing, so callers keep their
      // existing not-found handling (config-main → boot error).
      return apiResponse ?? new Response(null, { status: 404 });
    }

    const local = await this.fetchLocalConfig(name);
    if (local.ok) return local;

    if (this.isApiConfigEnabled()) {
      const apiResponse = await this.fetchApiConfig(name);
      if (apiResponse) return apiResponse;
    }

    // Nothing available: hand back the (non-OK) local response so existing
    // callers keep their current not-found handling.
    return local;
  }

  private fetchLocalConfig(name: ConfigFileName): Promise<Response> {
    const timestamp = Date.now();
    return fetch(`local-config/${name}.json?t=${timestamp}`);
  }

  /**
   * API config loading is enabled — i.e. a base URL is configured. Setting
   * apiConfigBaseUrl is the single switch; there is no separate on/off flag.
   */
  private isApiConfigEnabled(): boolean {
    return !!this.envService.getApiConfigBaseUrl();
  }

  /**
   * Force mode: load config exclusively from the API and skip local-config
   * entirely (even when a local file exists). Requires a configured base URL.
   */
  private isApiConfigForced(): boolean {
    return this.envService.isApiConfigForced() && this.isApiConfigEnabled();
  }

  /**
   * Fetch a config file from the /ui-config API. Returns null (→ no API config)
   * when the request fails, returns a non-OK status, or has an empty body
   * (the API answers 200 with an empty body when a config is not populated).
   */
  private async fetchApiConfig(name: ConfigFileName): Promise<Response | null> {
    const base = this.envService.getApiConfigBaseUrl().replace(/\/+$/, '');
    const endpoint = API_CONFIG_ENDPOINTS[name];
    const timestamp = Date.now();
    try {
      const response = await fetch(`${base}/ui-config/${endpoint}?t=${timestamp}`);
      if (!response.ok) return null;
      const text = await response.text();
      if (!text.trim()) return null;
      return new Response(text, { headers: { 'Content-Type': 'application/json' } });
    } catch (err) {
      console.warn(`ConfigService: Failed to load '${endpoint}' from API.`, err);
      return null;
    }
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
        logo: activeLib.logo || neutral.app.logo,
        logoDark: undefined
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

    return licenseArray.map(lic => lic.base
      // Variants carry partial overrides only. They must not be pre-filled here:
      //  - `isOnline`/`accessType`: `resolveLicenseForSource` merges as
      //    `{ ...base, ...variant }`, so a variant with no real `accessType` would
      //    inject a derived `isOnline: true` (undefined !== 'terminal') over the
      //    base license's true value.
      //  - `actions`: the resolver layers the variant's actions on top of the
      //    base's. Seeding a variant with `_defaults.actions` would turn those
      //    defaults into explicit overrides and strip the base's permissions from
      //    every variant that does not restate them.
      // Leaving all three absent lets the base license's values survive the merge.
      ? { ...lic }
      : {
        ...lic,
        isOnline: lic.accessType !== 'terminal',
        actions: { ...defaultActions, ...lic.actions }
      });
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

  /**
   * Whether user login (Keycloak OAuth/OIDC) is available in this deployment.
   * When `features.keycloak` is false the whole authenticated surface — login
   * button, user menu, favorites/folders and login-gated AI and export actions —
   * is hidden, and `AuthService.login()` refuses to start a flow.
   *
   * Read this instead of `features.keycloak` directly so the default (enabled
   * when omitted) stays in one place.
   */
  isLoginEnabled(): boolean {
    return this.isFeatureEnabled('keycloak');
  }

  /**
   * Whether user folders / favorites are available. Requires login: folders are
   * stored per user account, so they are unusable with `keycloak` off regardless
   * of the `folders` flag.
   */
  isFoldersEnabled(): boolean {
    return this.isLoginEnabled() && this.isFeatureEnabled('folders');
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
   * Library codes whose backend runs the public worker that generates the
   * whole-document PDF and EPUB exports. Everywhere else those two formats are
   * unavailable regardless of config, because the request would simply fail.
   *
   * Hardcoded deliberately (decision of 2026-08-27): the list tracks worker
   * rollout, not per-instance preference. Extend it as libraries gain the worker
   * — and once every library has it, drop this gate and let config decide again.
   */
  private static readonly PUBLIC_WORKER_LIBRARIES = ['knav', 'nkp'];

  /** Export formats produced by the public worker. */
  private static readonly PUBLIC_WORKER_FORMATS: ExportFormat[] = ['pdf', 'epub'];

  /**
   * True when the library that actually serves the open document runs the public
   * worker.
   *
   * On CDK this is NOT the instance code (`app.code` is always `cdk` there) but the
   * selected `cdk.collection` member — the library the document's data is being
   * loaded from, which is also the backend that would have to produce the export.
   * Off CDK there is no source, so the instance's own code decides.
   */
  private hasPublicWorker(): boolean {
    const code = this.cdkSource.getCode() || this.envService.getKrameriusId() || this.app?.code || '';
    return ConfigService.PUBLIC_WORKER_LIBRARIES.some(lib => code.includes(lib));
  }

  /**
   * Check whether a document export format (print/jpeg/pdf/epub/txt) is enabled.
   *
   * PDF and EPUB additionally require the serving library's backend to run the
   * public worker — config alone cannot enable them for a library that has none.
   * Because that depends on the selected CDK source, callers must re-evaluate this
   * when the source changes (see `CdkSourceService.code$`).
   */
  isExportFormatEnabled(format: ExportFormat): boolean {
    if (ConfigService.PUBLIC_WORKER_FORMATS.includes(format) && !this.hasPublicWorker()) {
      return false;
    }
    return this.export[format] ?? true;
  }

  /**
   * True when at least one export format is enabled. When false, the export
   * tab in the metadata sidebar should be hidden entirely.
   */
  isAnyExportFormatEnabled(): boolean {
    const formats: ExportFormat[] = ['print', 'jpeg', 'pdf', 'epub', 'txt'];
    // Goes through isExportFormatEnabled so the public-worker gate counts here too:
    // a library whose only configured formats are pdf/epub must not show an empty
    // export tab.
    return formats.some(f => this.isExportFormatEnabled(f));
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
  /**
   * Base licenses only — variants (`<base>__<source>`) are filtered out here so
   * they can never reach facets, license ordering or access-type lookups. Every
   * list accessor below derives from this getter.
   */
  get licenses(): LicensesConfig {
    return splitLicenseVariants(this.getConfig().licenses).base;
  }

  /** Base licenses *and* source-scoped variants. Only variant resolution reads this. */
  get allLicenses(): LicensesConfig {
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
   * Resolves a license id to the entry whose texts should be shown: the variant for
   * the currently selected CDK member library when one is configured, otherwise the
   * base license. Off CDK (and on the aggregated "all sources" view) no source is
   * set, so this always yields the base license — i.e. the pre-variant behaviour.
   */
  private resolveLicense(licenseId: string) {
    return resolveLicenseForSource(this.allLicenses, licenseId, this.cdkSource.getCode());
  }

  /**
   * Always resolves to the base license (no source), regardless of the currently
   * selected CDK member library. Used as the language-chain fallback: a variant's
   * localized fields (`label`, `instructionPage`, `messagePages[].page`) are whole-field
   * overrides — see `resolveLicenseForSource` — so a variant that defines only `cs`
   * shadows the base's `en` entirely rather than merging per language. Reaching back
   * into the base license here restores per-language fallback without deep-merging
   * the resolved license (which would break the "variant wins wholesale" contract
   * that `getLicenseConfig` and `getLocalizedLabel` rely on).
   */
  private resolveBaseLicense(licenseId: string) {
    return resolveLicenseForSource(this.allLicenses, licenseId, null);
  }

  /**
   * Get a specific license configuration, source-scoped when a variant applies.
   */
  getLicenseConfig(licenseId: string) {
    return this.resolveLicense(licenseId);
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
   *
   * SOURCE-SCOPED BY DESIGN: with a CDK member library selected, this may return a
   * library-specific label (a source-scoped variant), not the generic/global one. A
   * caller wiring this into a global or search-results context — where `key` is the
   * global id, not scoped to the current selection — should pass `ignoreSource: true`
   * to always resolve the base label. `ConfigLabelPipe` (and everything that flows
   * through it: filter-item, selected-tags, licenses-list, filter-dialog) currently
   * calls this without `ignoreSource`; that is correct where the surrounding UI is
   * itself scoped to the selected source, but is worth re-checking for any global
   * context added later.
   */
  getLocalizedLabel(type: 'license', key: string, lang: string, ignoreSource = false): string {
    switch (type) {
      case 'license': {
        const license = ignoreSource ? this.resolveBaseLicense(key) : this.resolveLicense(key);
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
   * Resolves a localized URL field (e.g. `instructionPage`, a `messagePages[].page`)
   * against the language chain, exhausting the variant's field across the WHOLE chain
   * before ever looking at the base license's field.
   *
   * This order matters: a source-scoped variant exists to say "here is the
   * library-specific text," so if the variant has that text in ANY language of the
   * chain, it must win over the generic base text — even if the base happens to have
   * an exact match for the originally requested language. Interleaving the two
   * per-language (checking variant then base at each language before moving to the
   * next) would let a generic base match at the first language mask a real
   * library-specific match at a later language in the chain, silently defeating the
   * whole point of the feature. The base is a last resort, tried only once the
   * variant field has nothing left to offer in any language.
   */
  private resolveLocalizedUrl(
    variantField: LocalizedLabel | undefined,
    baseField: LocalizedLabel | undefined,
    lang: string,
  ): string | null {
    const chain = this.getLangChain(lang);
    for (const l of chain) {
      if (variantField?.[l]) return variantField[l];
    }
    for (const l of chain) {
      if (baseField?.[l]) return baseField[l];
    }
    return null;
  }

  /**
   * Get the URL for a specific message page by license ID, page key, and language.
   * Falls back through the language chain if the requested language is not available.
   */
  getMessagePageUrl(licenseId: string, pageKey: string, lang: string): string | null {
    const license = this.resolveLicense(licenseId);
    if (!license?.messagePages) return null;

    const messagePage = license.messagePages.find(mp => mp.key === pageKey);
    if (!messagePage) return null;

    const baseMessagePage = this.resolveBaseLicense(licenseId)?.messagePages?.find(mp => mp.key === pageKey);

    return this.resolveLocalizedUrl(messagePage.page, baseMessagePage?.page, lang);
  }

  /**
   * Get the URL for the instruction page by license ID and language.
   * Falls back through the language chain if the requested language is not available.
   */
  getInstructionPageUrl(licenseId: string, lang: string): string | null {
    const license = this.resolveLicense(licenseId);
    if (!license?.instructionPage) return null;

    const baseInstructionPage = this.resolveBaseLicense(licenseId)?.instructionPage;

    return this.resolveLocalizedUrl(license.instructionPage, baseInstructionPage, lang);
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
      const html = new TextDecoder('utf-8').decode(buffer);
      // Editor-authored HTML often carries pasted inline colours and fonts that
      // break dark mode and the design system; strip those, keep layout styles.
      return sanitizeContentHtml(html);
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
