import { ConfigService } from '../config';

// Reference to ConfigService, set during app initialization
let configServiceRef: ConfigService | null = null;

/**
 * Initialize the license utilities with ConfigService.
 * Called from app initialization.
 */
export function initLicenseConfig(configService: ConfigService): void {
  configServiceRef = configService;
}

// Default values (used as fallback if ConfigService not available)
const DEFAULT_ONLINE_LICENSES = ['public', 'mzk_public-contract', 'mzk_public-muo', 'knav_public_contract', 'dnnto'];
const DEFAULT_TERMINAL_LICENSES = ['dnntt', 'onsite', 'onsite-sheetmusic'];
const DEFAULT_OPEN_LICENSES = ['public', 'mzk_public-contract', 'mzk_public-muo', 'knav_public_contract'];
const DEFAULT_AFTER_LOGIN_LICENSES = ['dnnto'];
const DEFAULT_LICENSES_ORDER = [
  'mzk_public-muo',
  'mzk_public-contract',
  'knav_public_contract',
  'public',
  'dnnto',
  'dnntt',
  'onsite',
  'onsite-sheetmusic',
  '_private'
];

/**
 * Get online licenses (accessible remotely).
 * Reads from ConfigService if available, otherwise uses defaults.
 */
export function getOnlineLicenses(): string[] {
  if (configServiceRef) {
    return configServiceRef.getOnlineLicenses();
  }
  return DEFAULT_ONLINE_LICENSES;
}

/**
 * Get terminal licenses (requires physical presence).
 * Reads from ConfigService if available, otherwise uses defaults.
 */
export function getTerminalLicenses(): string[] {
  if (configServiceRef) {
    return configServiceRef.getTerminalLicenses();
  }
  return DEFAULT_TERMINAL_LICENSES;
}

/**
 * Get open licenses (freely accessible).
 * Reads from ConfigService if available, otherwise uses defaults.
 */
export function getOpenLicenses(): string[] {
  if (configServiceRef) {
    return configServiceRef.getOpenLicenses();
  }
  return DEFAULT_OPEN_LICENSES;
}

/**
 * Get after-login licenses (requires authentication).
 * Reads from ConfigService if available, otherwise uses defaults.
 */
export function getAfterLoginLicenses(): string[] {
  if (configServiceRef) {
    return configServiceRef.getAfterLoginLicenses();
  }
  return DEFAULT_AFTER_LOGIN_LICENSES;
}

/**
 * Get ordered list of all licenses for display purposes.
 * Reads from ConfigService if available, otherwise uses defaults.
 */
export function getLicensesOrder(): string[] {
  if (configServiceRef) {
    return configServiceRef.getLicenseOrder();
  }
  return DEFAULT_LICENSES_ORDER;
}

/**
 * Get all configured license IDs.
 * Returns all license keys from the config file.
 */
export function getConfiguredLicenses(): string[] {
  if (configServiceRef) {
    return Object.keys(configServiceRef.licenses);
  }
  return DEFAULT_LICENSES_ORDER.filter(l => l !== '_private');
}

/**
 * Get configured document types (models/doctypes) for filtering.
 * Returns the doctypes from search config, or empty array if not configured (meaning all allowed).
 */
export function getConfiguredModels(): string[] {
  if (configServiceRef) {
    return configServiceRef.getConfig().search?.doctypes || [];
  }
  return [];
}

// Legacy exports for backward compatibility
// These are kept as constants but components should migrate to using the functions above
export const ONLINE_LICENSES = DEFAULT_ONLINE_LICENSES;
export const TERMINAL_LICENSES = DEFAULT_TERMINAL_LICENSES;
export const OPEN_LICENSES = DEFAULT_OPEN_LICENSES;
export const AFTER_LOGIN_LICENSES = DEFAULT_AFTER_LOGIN_LICENSES;
export const LICENSES_ORDER = DEFAULT_LICENSES_ORDER;

