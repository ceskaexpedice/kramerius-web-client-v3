export const environment = {

  // used by EnvironmentService
  useStaticRuntimeConfig: true, // DŮLEŽITÉ: pokud je true, konfigurace se načítá z env.json; Pro produkci vždy true, pro lokální vývoj (environment.local.ts) false

  // overriden with env.json if useStaticRuntimeConfig is true
  devMode: false, // pro produkci ziskej z promenne APP_DEV_MODE (přes env.json)
  environmentName: 'deployed (branch main)', // pro produkci ziskej z promenne APP_ENV_NAME (přes env.json)
  environmentCode: 'd_m', // pro produkci ziskej z promenne APP_ENV_CODE (přes env.json)

  krameriusBaseUrl: 'https://api.kramerius.mzk.cz/search/api/client/v7.0/', // pro produkci ziskej z promenne APP_KRAMERIUS_URL (přes env.json)

};
