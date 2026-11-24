export const environment = {

  // used by EnvironmentService
  useStaticRuntimeConfig: true, // IMPORTANT: when true, configuration is loaded from env.json. Always true in production; false for local development (environment.local.ts)

  // overriden with env.json if useStaticRuntimeConfig is true
  devMode: true, // production: from APP_DEV_MODE (via env.json)
  environmentName: 'deployed (branch dev)', // production: from APP_ENV_NAME (via env.json)
  environmentCode: 'd_d', // production: from APP_ENV_CODE (via env.json)

  // --- UI config from API (/ui-config/*) ---
  // Base URL of the client API incl. version, e.g.
  // https://.../search/api/client/v7.0 (no trailing /ui-config). Setting this
  // is the single switch that enables loading config-main/licenses/homepage
  // from the API; a local-config file, when present, still wins. Empty →
  // behaves exactly like before (local-config only).
  // Production: from APP_API_CONFIG_BASE_URL (via env.json).
  apiConfigBaseUrl: '',
  // When true, config is loaded EXCLUSIVELY from the API — local-config is
  // skipped entirely, even when a local file exists. For deployments that ship
  // no local-config. Requires apiConfigBaseUrl. Default false.
  // Production: from APP_FORCE_API_CONFIG (via env.json).
  forceApiConfig: false,

};
