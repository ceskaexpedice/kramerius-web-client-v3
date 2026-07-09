export const environment = {

  // used by EnvironmentService
  useStaticRuntimeConfig: true, // DŮLEŽITÉ: pokud je true, konfigurace se načítá z env.json; Pro produkci vždy true, pro lokální vývoj (environment.local.ts) false

  // overriden with env.json if useStaticRuntimeConfig is true
  devMode: true, // pro produkci ziskej z promenne APP_DEV_MODE (přes env.json)
  environmentName: 'deployed (branch dev)', // pro produkci ziskej z promenne APP_ENV_NAME (přes env.json)
  environmentCode: 'd_d', // pro produkci ziskej z promenne APP_ENV_CODE (přes env.json)

  // --- UI config from API (/ui-config/*) ---
  // When true, ConfigService tries to load config-main/licenses/homepage from
  // the Kramerius client API. A local-config file, when present, still wins.
  // Default false → behaves exactly like before (local-config only).
  // Pro produkci ziskej z promenne APP_USE_API_CONFIG (přes env.json).
  useApiConfig: true,
  // Base URL of the client API incl. version, e.g.
  // https://.../search/api/client/v7.0 (no trailing /ui-config).
  // Pro produkci: APP_API_CONFIG_BASE_URL.
  apiConfigBaseUrl: '',

};
