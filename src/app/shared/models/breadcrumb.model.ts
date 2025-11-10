export interface Breadcrumb {
  /**
   * Display label for the breadcrumb
   */
  label: string;

  /**
   * Navigation URL/path
   */
  url: string;

  /**
   * Optional icon class (e.g., 'icon-home')
   */
  icon?: string;

  /**
   * Query parameters to include in navigation
   */
  queryParams?: any;

  /**
   * Whether this breadcrumb is clickable
   * @default true
   */
  clickable?: boolean;

  /**
   * Optional translation key for the label
   * If provided, will be translated using TranslateService
   */
  translationKey?: string;
}

export interface BreadcrumbConfig {
  /**
   * Whether to show home icon as first item
   * @default true
   */
  showHome?: boolean;

  /**
   * Custom separator between breadcrumbs
   * @default '/'
   */
  separator?: string;

  /**
   * Whether the last breadcrumb should be clickable
   * @default false
   */
  lastItemClickable?: boolean;

  /**
   * Maximum number of breadcrumbs to show before truncating
   */
  maxItems?: number;
}
