import { EnvironmentService } from '../../shared/services/environment.service';
import { ConfigService } from '../config/config.service';
import { initLicenseConfig } from '../solr/solr-misc';
import { SolrQueryBuilder } from '../solr/solr-query-builder';

/**
 * Check for ?lib={code} in the URL. If present and different from the current
 * library, look up the library in libraries.json, set localStorage, clean the
 * URL, and reload. Returns true if a reload was triggered.
 */
async function handleLibraryFromUrl(): Promise<boolean> {
  const url = new URL(window.location.href);
  const libCode = url.searchParams.get('lib');
  if (!libCode) return false;

  // Clean lib param from URL immediately
  url.searchParams.delete('lib');
  window.history.replaceState({}, '', url.pathname + url.search + url.hash);

  // Check if already on this library
  const currentCode = localStorage.getItem('CDK_DEV_KRAMERIUS_ID') || 'mzk';
  if (currentCode === libCode) return false;

  // Look up library URL from libraries.json
  try {
    const response = await fetch(ConfigService.getLibrariesUrl());
    if (!response.ok) return false;
    const libraries: Array<{ code: string; url: string }> = await response.json();
    const library = libraries.find(lib => lib.code === libCode);
    if (!library) {
      console.warn(`Library "${libCode}" not found in libraries.json`);
      return false;
    }
    localStorage.setItem('CDK_DEV_BASE_URL', library.url);
    localStorage.setItem('CDK_DEV_KRAMERIUS_ID', library.code);
    window.location.reload();
    return true;
  } catch (err) {
    console.warn('Error processing lib query parameter:', err);
    return false;
  }
}

/**
 * APP_INITIALIZER factory.
 * Handles library URL switching, then loads environment and config.
 */
export function initApp(envService: EnvironmentService, configService: ConfigService) {
  return async () => {
    if (await handleLibraryFromUrl()) return;
    await envService.load();
    await configService.load();
    initLicenseConfig(configService);
    SolrQueryBuilder.setConfiguredModels(configService.getConfig().search?.doctypes || []);
  };
}
