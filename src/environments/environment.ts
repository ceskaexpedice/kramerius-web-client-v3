export const environment = {

  // used by EnvironmentService
  useStaticRuntimeConfig: true, // DŮLEŽITÉ: pokud je true, konfigurace se načítá z env.json; Pro produkci vždy true, pro lokální vývoj (environment.local.ts) false

  // overriden with env.json if useStaticRuntimeConfig is true
  devMode: true, // pro produkci ziskej z promenne APP_DEV_MODE (přes env.json)
  environmentName: 'deployed (branch dev)', // pro produkci ziskej z promenne APP_ENV_NAME (přes env.json)
  environmentCode: 'd_d', // pro produkci ziskej z promenne APP_ENV_CODE (přes env.json)

  // --- UI config from API (/ui-config/*) ---
  // Base URL of the client API incl. version, e.g.
  // https://.../search/api/client/v7.0 (no trailing /ui-config). Setting this
  // is the single switch that enables loading config-main/licenses/homepage
  // from the API; a local-config file, when present, still wins. Empty →
  // behaves exactly like before (local-config only).
  // Pro produkci ziskej z promenne APP_API_CONFIG_BASE_URL (přes env.json).
  apiConfigBaseUrl: '',
  // When true, config is loaded EXCLUSIVELY from the API — local-config is
  // skipped entirely, even when a local file exists. For deployments that ship
  // no local-config. Requires apiConfigBaseUrl. Default false.
  // Pro produkci: APP_FORCE_API_CONFIG.
  forceApiConfig: false,

};
