# Uživatelský klient Krameria

> Toto je uživatelské rozhraní pro [systém Kramerius](https://system-kramerius.cz/). Jádro systému a hlavní dokumentaci najdete v [`ceskaexpedice/kramerius`](https://github.com/ceskaexpedice/kramerius).
----

Docker HUB: [https://hub.docker.com/r/trinera/cdk-client](https://hub.docker.com/r/trinera/cdk-client)

Tento projekt byl vygenerován pomocí [Angular CLI](https://github.com/angular/angular-cli) verze 18.0.6. Později byl aktualizován na Angular 21.

## Spuštění pro vývoj

```shell
npm run start
```

Spustí lokální vývojový server.

Otevřít v prohlížeči:

```text
http://localhost:4200/
```

Aplikace se automaticky znovu načte při změně zdrojových souborů.

## Build & Run (klasické)

### Build

Knihovna, jako která klient běží, je určena soubory v `public/local-config/`.

Spusťte build:

```shell
npm run build
```

Výstupy buildu budou uloženy v adresáři `dist/`.

### Spuštění

Chcete-li otestovat aplikaci, kterou jste právě sestavili, spusťte:

```shell
npx serve dist/cdk-client/browser -l 8080
```

Otevřít v prohlížeči:

```text
http://localhost:8080
```

## Spuštění jako vaše vlastní knihovna

Chcete-li klienta spustit jako **svou vlastní** knihovnu, **nemusíte** upravovat
žádný zdrojový kód — stačí poskytnout vaše konfigurační soubory v
`public/local-config/`.

1. **Umístěte své konfigurační soubory přímo do** `public/local-config/`:

   ```text
   public/local-config/config-main.json       # povinné: app.code, api.baseUrl, i18n
   public/local-config/config-licenses.json    # volitelné
   public/local-config/config-homepage.json    # volitelné
   ```

   Formát každého souboru je zdokumentován v [`docs/config/`](docs/config/).
   `config-main.json` je jediný povinný soubor; ostatní se při vynechání vrátí
   k vestavěným výchozím hodnotám. Pokud soubor `config-main.json` chybí nebo je
   neplatný, aplikace se nespustí.

2. **Sestavte a spusťte:**

   ```shell
   export APP_DEV_MODE=false
   npm run build
   npx serve dist/cdk-client/browser -l 8080
   ```

   Klient se spustí jako instance definovaná pomocí `app.code` a připojí se
   k backendu z `public/local-config/config-main.json` → `api.baseUrl`.

> **Poznámka.** Backend, se kterým klient komunikuje, pochází výhradně z
> `config-main.json` (`api.baseUrl`). Vždy nastavte `api.baseUrl` ve svém
> `config-main.json` — neexistuje žádný napevno zakódovaný backend.

V Dockeru lze tytéž soubory připojit za běhu, místo aby byly zapečené do image —
viz [Lokální konfigurace (volume)](#lokální-konfigurace-volume).

## Načítání konfigurace z API

Trojici konfiguračních souborů (`config-main`, `config-licenses`,
`config-homepage`) lze místo z `local-config/` načítat z Kramerius API přes
endpointy `/ui-config/*`:

| Lokální soubor | API endpoint |
|---|---|
| `config-main.json` | `.../ui-config/general` |
| `config-licenses.json` | `.../ui-config/licenses` |
| `config-homepage.json` | `.../ui-config/curator-lists` |

API vrací **stejné tvary**, jaké očekává lokální loader — nic se netransformuje.
Načítání z API se **zapíná nastavením `apiConfigBaseUrl`** (env proměnná
`APP_API_CONFIG_BASE_URL` v Dockeru, nebo `environment.ts` pro lokální vývoj);
žádný samostatný přepínač zapnuto/vypnuto není. Prázdná hodnota → jen
`local-config`, jako dřív.

**Priorita: lokální soubor vždy vyhrává, když existuje** (pokud není zapnutý
`APP_FORCE_API_CONFIG`).

| API zapnuté | soubor v `local-config/` | použije se |
|---|---|---|
| ano | existuje | **lokální** (přepíše API) |
| ano | chybí | **API** |
| ne | existuje | **lokální** |
| ne | chybí | nic → chyba (u `config-main` aplikace nenaběhne) |

S `APP_FORCE_API_CONFIG=true` se `local-config/` ignoruje úplně a čte se **jen
z API** — priorita výše se neuplatní.

S prázdným `local-config/` a zapnutým API klient naběhne kompletně z API. Adresu
backendu si aplikace vezme z `api.baseUrl` **uvnitř** konfigurace vrácené z API
(endpoint `general`) — proměnná `APP_API_CONFIG_BASE_URL` určuje jen, odkud se
čte samotná konfigurace.

Env proměnné (Docker):

| Proměnná | Výchozí | Popis |
|---|---:|---|
| `APP_API_CONFIG_BASE_URL` | — | Základní adresa API vč. verze, např. `https://.../search/api/client/v7.0`. **Nastavení této proměnné zapíná načítání z API** (žádný samostatný přepínač). Prázdné → jen `local-config`. |
| `APP_FORCE_API_CONFIG` | `false` | Načítá konfiguraci **výhradně** z API a `local-config/` úplně přeskočí (i když soubory existují). Pro nasazení bez `local-config`. Vyžaduje `APP_API_CONFIG_BASE_URL`. |

Podrobnosti viz [`docs/guide.md`](docs/guide.md#načítání-konfigurace-z-api-volitelné).

## Build & Run s Dockerem

### Build image

```shell
docker build -t trinera/cdk-client:3.0.20-beta .
```

### Build & push (multiplatformní) image na Docker Hub

```shell
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t trinera/cdk-client:3.0.20-beta \
  --push .
```

### Spuštění kontejneru pomocí `docker run`

```shell
docker run -p 1234:80 \
  trinera/cdk-client:3.0.20-beta
```

Otevřít v prohlížeči:

```text
http://localhost:1234
```

Knihovna, jako která kontejner běží, pochází z konfiguračních souborů, které
servíruje z `local-config/`. Výchozí konfiguraci přepíšete připojením vlastního
adresáře:

```shell
docker run -p 1234:80 \
  -e APP_DEV_MODE=true \
  -v ./public/local-config:/usr/share/nginx/local-config:ro \
  trinera/cdk-client:3.0.20-beta
```

## Spuštění pomocí Docker Compose

Vytvořte soubor `docker-compose.yml`:

```yaml
services:
  cdk-client:
    image: trinera/cdk-client:3.0.20-beta
    ports:
      - "1234:80"
    environment:
      - APP_DEV_MODE=${APP_DEV_MODE:-true}
      # Volitelné: načítání konfigurace z API (/ui-config/*). Namountovaný
      # lokální soubor má stále přednost. Ve výchozím stavu vypnuto.
      # Nastavení base URL zapíná načítání z API. Prázdné → jen local-config.
      - APP_API_CONFIG_BASE_URL=${APP_API_CONFIG_BASE_URL:-}
      # Jen API, local-config se přeskočí úplně (i namountovaný).
      - APP_FORCE_API_CONFIG=${APP_FORCE_API_CONFIG:-false}
    volumes:
      # Volitelné: přepíše výchozí lokální konfiguraci.
      - ./public/local-config:/usr/share/nginx/local-config:ro
    healthcheck:
      test: ["CMD", "wget", "--quiet", "-O", "/dev/stdout", "http://127.0.0.1/local-config/config-main.json"]
      start_period: 30s
      interval: 30s
      timeout: 5s
      retries: 3
```

Spuštění aplikace:

```shell
docker compose up -d
```

Zastavení aplikace:

```shell
docker compose down
```

Otevřít v prohlížeči:

```text
http://localhost:1234
```

### Lokální konfigurace (volume)
Docker image obsahuje výchozí verzi konfiguračních souborů.
Volitelně lze výchozí konfiguraci přepsat připojením lokálního adresáře z hostitelského systému:

```yaml
volumes:
  - ./public/local-config:/usr/share/nginx/local-config:ro
```

Tím se namapují lokální konfigurační soubory z:

```text
./public/local-config
```

na cestu v kontejneru:

```text
/usr/share/nginx/local-config
```

Volume je připojen jako read-only pomocí přípony `:ro`.

Díky tomu image funguje ihned s výchozí konfigurací, ale zároveň umožňuje poskytnout runtime konfiguraci externě.

Například lokální soubor:

```text
./public/local-config/config-main.json
```

přepíše výchozí soubor v image a nginx ho bude servírovat jako:

```text
/local-config/config-main.json
```

Soubor lze ověřit z hostitelského systému na adrese:

```text
http://localhost:1234/local-config/config-main.json
```

Pokud vlastní lokální konfiguraci nepotřebujete, můžete sekci `volumes` z `docker-compose.yml` odstranit.
