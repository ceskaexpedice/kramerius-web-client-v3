// Application configuration
export interface AppConfig {
  code: string;           // e.g., 'cdk'
  name: string;           // e.g., 'Czech Digital Library'
  version: string;        // e.g., '2.0.0'
  baseUrl: string;        // Application base URL
  contactEmail: string;   // Contact email
  logo?: string;          // URL to the app/library logo
}

// API configuration
export interface ApiConfig {
  baseUrl: string;        // API base URL
  clientVersion: string;  // e.g., '7.0'
}

// Internationalization configuration
export interface I18nConfig {
  defaultLanguage: string;          // e.g., 'cs'
  fallbackLanguage: string;         // e.g., 'en'
  supportedLanguages: string[];     // e.g., ['cs', 'en', 'sk', 'de', 'pl']
}

// Analytics integration
export interface AnalyticsConfig {
  provider?: string;      // e.g., 'ga4'
  enabled: boolean;
  measurementId?: string; // For Google Analytics
  matomoUrl?: string;
  matomoSiteId?: string;
}

// Google Maps integration
export interface GoogleMapsConfig {
  enabled: boolean;
  apiKey?: string;
}

// Integrations configuration
export interface IntegrationsConfig {
  analytics?: AnalyticsConfig;
  googleMaps?: GoogleMapsConfig;
}

// Feature flags
export interface FeaturesConfig {
  advancedSearch: boolean;
  iiif: boolean;
  mapSearch: boolean;
  georef: boolean;
  ai: boolean;
  folders: boolean;
  crossOrigin: boolean;
  librarySwitch: boolean;
}

// UI configuration
export interface UiConfig {
  cookiebar: boolean;
}

// Viewer mode type
export type ViewerMode = 'book' | 'single';

// Viewer controls configuration
export interface ViewerControlsConfig {
  zoomIn: boolean;
  zoomOut: boolean;
  fullscreen: boolean;
  fitToScreen: boolean;
  fitToWidth: boolean;
  scrollMode: boolean;
  bookMode: boolean;
  rotate: boolean;
  selectArea: boolean;
}

// Selection controls configuration
export interface SelectionControlsConfig {
  text: boolean;
  export: boolean;
  share: boolean;
}

// Viewer configuration
export interface ViewerConfig {
  defaultMode: ViewerMode;
  availableModes: ViewerMode[];
  rememberLastMode: boolean;
  controls?: ViewerControlsConfig;
  selectionControls?: SelectionControlsConfig;
}

// Search configuration
export interface SearchConfig {
  doctypes: string[];
  filters: string[];
}

// License access type
export type LicenseAccessType = 'open' | 'terminal' | 'login';

// Localized label
export interface LocalizedLabel {
  [lang: string]: string;
}

// License actions configuration
export interface LicenseActionsConfig {
  pdf: boolean;
  print: boolean;
  jpeg: boolean;
  text: boolean;
  textMode: boolean;
  citation: boolean;
  metadata: boolean;
  share: boolean;
  selection: boolean;
  crop: boolean;
}

export interface LicenseMessagePage {
  key: string;
  page: LocalizedLabel;
}

// Single license configuration
export interface LicenseConfig {
  id: string;
  accessType: LicenseAccessType;
  isOnline: boolean;
  label: LocalizedLabel;
  messagePages?: LicenseMessagePage[];
  instructionPage?: LocalizedLabel;
  actions: LicenseActionsConfig;
}

// Licenses configuration (keyed by license ID)
export interface LicensesConfig {
  [licenseId: string]: LicenseConfig;
}

// Localized content — single URL or array of URLs per language
export interface LocalizedContent {
  [lang: string]: string | string[];
}

// Configurable content page
export interface PageConfig {
  id: string;
  label?: LocalizedLabel;
  content: LocalizedContent;
  showInHeader?: boolean;
}

// Home section link item
export interface HomepageLinkItem {
  label: string | LocalizedLabel;
  type?: string;
  url: string;
  icon?: string;
  count?: number;
}

// Suggested search tag item
export interface SuggestedSearchTagItem {
  text: string | LocalizedLabel;
  filter: string;
}

// Home section configuration
export interface HomepageSectionConfig {
  type: 'periodicals' | 'books' | 'authors' | 'genres' | 'images' | 'document-types' | 'map' | 'institutions' | 'local-records' | 'local-categories' | 'suggested-tags';
  title: string | LocalizedLabel;
  items?: Record<string, any>[];
  pids?: string[];
  hideIfEmpty?: boolean;
  visible?: boolean;
  comment?: string;
  sectionUrl?: string;
  buttonText?: string | LocalizedLabel;
  cardVariant?: 'default' | 'portrait';
  categories?: HomepageLinkItem[];
  showCount?: boolean;
  tags?: SuggestedSearchTagItem[];
}

// Root configuration interface
export interface AppConfiguration {
  app: AppConfig;
  api: ApiConfig;
  i18n: I18nConfig;
  integrations?: IntegrationsConfig;
  features: FeaturesConfig;
  ui: UiConfig;
  viewer: ViewerConfig;
  search?: SearchConfig;
  licenses: LicensesConfig;
  pages?: PageConfig[];
  homeSections?: HomepageSectionConfig[];
  homepageTitle?: LocalizedLabel;
  homepageSubtitle?: LocalizedLabel;
}
