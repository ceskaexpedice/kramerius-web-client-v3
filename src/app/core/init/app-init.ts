import { EnvironmentService } from '../../shared/services/environment.service';
import { ConfigService } from '../config/config.service';
import { initLicenseConfig } from '../solr/solr-misc';
import { SolrQueryBuilder } from '../solr/solr-query-builder';

/**
 * APP_INITIALIZER factory.
 * Library routing is handled by the :libCode route prefix and libraryPrefixGuard.
 */
export function initApp(envService: EnvironmentService, configService: ConfigService) {
  return async () => {
    await envService.load();
    await configService.load();
    initLicenseConfig(configService);
    SolrQueryBuilder.setConfiguredModels(configService.getConfig().search?.doctypes || []);
  };
}
