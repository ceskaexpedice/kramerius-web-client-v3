import { EnvironmentService } from '../../shared/services/environment.service';
import { ConfigService } from '../config/config.service';
import { UserService } from '../../shared/services/user.service';
import { initLicenseConfig } from '../solr/solr-misc';
import { SolrQueryBuilder } from '../solr/solr-query-builder';

/**
 * APP_INITIALIZER factory.
 * Library routing is handled by the :libCode route prefix and libraryPrefixGuard.
 */
export function initApp(envService: EnvironmentService, configService: ConfigService, userService: UserService) {
  return async () => {
    await envService.load();
    try {
      await configService.load();
    } catch (err) {
      document.body.innerHTML =
        '<div style="font-family:sans-serif;padding:2rem;color:#b00">' +
        'Chyba: konfiguráciu sa nepodarilo načítať (config-main.json).' +
        '</div>';
      throw err;
    }
    initLicenseConfig(configService);
    SolrQueryBuilder.setConfiguredModels(configService.getConfig().search?.doctypes || []);

    // Load the user session AFTER config is applied, so the request targets the
    // configured backend (api.baseUrl) and _licenses is populated before any
    // record renders. Otherwise an early session fetch hits an empty base URL
    // (→ localhost) and every record falsely shows as locked until navigation.
    // A session failure must not block bootstrap.
    try {
      await userService.loadUserData();
    } catch (err) {
      console.warn('initApp: failed to load user session at startup.', err);
    }
  };
}
