# Návod: jak rozběhat CDK klienta

Tento návod popisuje, jak spustit CDK klienta (webové rozhraní pro Kramerius) —
buď přes Docker, nebo z naklonovaného projektu — a co musí udělat knihovna, která
chce klienta provozovat nad **svým** Krameriem.

> **Klíčový princip.** Klient vždy běží jako **jedna konkrétní knihovna**. Veškeré
> chování (název, logo, adresa backendu, funkce, licence, obsah domovské stránky…)
> určují konfigurační soubory v adresáři [`public/local-config/`](../public/local-config/).
> Tyto soubory se čtou **přímo z tohoto adresáře**. Kód knihovny se bere z pole `app.code` v `config-main.json`.
>
> Pokud `config-main.json` chybí nebo je neplatný, aplikace **nenaběhne** a zobrazí
> chybu konfigurace.

---

## Obsah

- [Předpoklady](#předpoklady)
- [Konfigurační soubory](#konfigurační-soubory)
- [Varianta A — spuštění přes Docker](#varianta-a--spuštění-přes-docker)
- [Varianta B — spuštění z naklonovaného projektu](#varianta-b--spuštění-z-naklonovaného-projektu)
- [Postup pro knihovnu XY](#postup-pro-knihovnu-xy)
- [Řešení problémů](#řešení-problémů)

---

## Předpoklady

Podle zvolené varianty potřebujete:

| Varianta | Potřebujete |
|---|---|
| Docker | nainstalovaný [Docker](https://docs.docker.com/get-docker/) (a volitelně Docker Compose) |
| Z projektu | [Node.js](https://nodejs.org/) (LTS), `npm`, a `git` |

Dále potřebujete **funkční Kramerius backend** (verze API v7), na který se klient
připojí — jeho adresu zadáte do konfigurace (`api.baseUrl`).

---

## Konfigurační soubory

Všechny konfigurační soubory leží přímo v `public/local-config/`:

```text
public/local-config/
├── config-main.json        # POVINNÝ — identita knihovny, adresa backendu, funkce
├── config-licenses.json    # volitelný — licence (režimy přístupu k dokumentům)
├── config-homepage.json    # volitelný — obsah a pořadí sekcí domovské stránky
├── html/                   # volitelné — HTML stránky (O projektu, Podmínky, licence…)
├── img/                    # volitelné — obrázky (autoři, žánry, watermark…)
└── libraries.json          # seznam knihoven pro interní přepínač (nechte být)
```

Formát každého souboru je podrobně popsaný v [`docs/config/`](config/):

- [`config-main.md`](config/config-main.md)
- [`config-licenses.md`](config/config-licenses.md)
- [`config-homepage.md`](config/config-homepage.md)

**Povinný je pouze `config-main.json`.** Ostatní soubory a jednotlivá chybějící
pole se doplní vestavěnými výchozími hodnotami.

### Minimální `config-main.json`

```json
{
  "app": {
    "code": "xy",
    "name": { "cs": "Knihovna XY", "en": "Library XY" },
    "contactEmail": "info@knihovna-xy.cz",
    "logo": "/favicon.svg"
  },
  "api": {
    "baseUrl": "https://kramerius.knihovna-xy.cz/search/api/client"
  },
  "i18n": {
    "defaultLanguage": "cs",
    "fallbackLanguage": "en",
    "supportedLanguages": ["cs", "en"]
  }
}
```

- `app.code` — krátký kód knihovny. Slouží jako identita instance (IIIF, rozpoznání
  CDK agregátoru). **Není** to název adresáře — adresář žádný není.
- `api.baseUrl` — adresa Kramerius API backendu. Obvykle končí na `/search/api/client`.
  Toto je jediný zdroj připojení k backendu; klient nikdy neháduje adresu jinak.

---

## Varianta A — spuštění přes Docker

Toto je nejrychlejší způsob, jak klienta rozběhat bez instalace Node.js.

### 1. Získejte image

Hotový image je publikovaný na Docker Hubu:
[**trinera/cdk-client**](https://hub.docker.com/r/trinera/cdk-client). Stáhnete jej
příkazem:

```shell
docker pull trinera/cdk-client:latest
```

> Konkrétní verzi zvolíte tagem, např. `trinera/cdk-client:1.0.0`. Dostupné tagy
> najdete na [stránce image na Docker Hubu](https://hub.docker.com/r/trinera/cdk-client/tags).

Alternativně si image sestavte z projektu:

```shell
docker build -t trinera/cdk-client:latest .
```

### 2. Spusťte kontejner

Image obsahuje výchozí (vestavěnou) konfiguraci. Pro spuštění s **vlastní**
konfigurací namountujte svůj adresář `local-config` do kontejneru:

```shell
docker run -p 1234:80 \
  -e APP_DEV_MODE=false \
  -v ./public/local-config:/usr/share/nginx/local-config:ro \
  trinera/cdk-client:latest
```

- `-p 1234:80` — klient poběží na `http://localhost:1234`.
- `-v ...:ro` — namountuje vaši konfiguraci (jen pro čtení). Cesta v kontejneru je
  vždy `/usr/share/nginx/local-config`. Uvnitř musí ležet přímo `config-main.json`.
- Bez volby `-v` se použije konfigurace zabudovaná v image.

Otevřete v prohlížeči:

```text
http://localhost:1234
```

### 3. Přes Docker Compose (volitelně)

Vytvořte `docker-compose.yml`:

```yaml
services:
  cdk-client:
    image: trinera/cdk-client:latest
    ports:
      - "1234:80"
    environment:
      - APP_DEV_MODE=false
    volumes:
      # Přepíše vestavěnou konfiguraci vaší vlastní.
      - ./public/local-config:/usr/share/nginx/local-config:ro
    healthcheck:
      test: ["CMD", "wget", "--quiet", "-O", "/dev/stdout", "http://127.0.0.1/local-config/config-main.json"]
      start_period: 30s
      interval: 30s
      timeout: 5s
      retries: 3
```

Spuštění a zastavení:

```shell
docker compose up -d      # spustí na pozadí
docker compose down       # zastaví
```

### Proměnné prostředí (Docker)

| Proměnná | Výchozí | Popis |
|---|---:|---|
| `APP_DEV_MODE` | `true` | Zapíná/vypíná vývojový režim. |

---

## Varianta B — spuštění z naklonovaného projektu

Vhodné pro vývoj a úpravy.

### 1. Naklonujte projekt

```shell
git clone <URL-repozitáře> cdk-client
cd cdk-client
```

### 2. Nainstalujte závislosti

```shell
npm install
```

### 3. Připravte konfiguraci

Upravte soubory v `public/local-config/` tak, aby odpovídaly vaší knihovně
(viz [Konfigurační soubory](#konfigurační-soubory)). Minimálně nastavte
`app.code` a `api.baseUrl` v `config-main.json`.

### 4a. Vývojový server (s automatickým překladem změn)

```shell
npm run start
```

Klient poběží na `http://localhost:4200/` a při změně zdrojových souborů se
automaticky obnoví. Konfiguraci čte z `public/local-config/`.

### 4b. Produkční build

```shell
npm run build
```

Výstup se uloží do `dist/cdk-client/browser/`. Ten pak naservírujte libovolným
statickým webserverem, například:

```shell
npx serve dist/cdk-client/browser -l 8080
```

Klient poběží na `http://localhost:8080`. Adresu backendu bere z `api.baseUrl`
v `config-main.json`.

---

## Postup pro knihovnu XY

Chcete-li provozovat klienta nad **svým** Krameriem (kód `xy`), nemusíte upravovat
žádný zdrojový kód — stačí dodat konfiguraci. Postup:

1. **Připravte `config-main.json`** (povinný) s minimálně:

   ```json
   {
     "app": { "code": "xy", "name": { "cs": "Knihovna XY", "en": "Library XY" } },
     "api": { "baseUrl": "https://kramerius.knihovna-xy.cz/search/api/client" },
     "i18n": { "defaultLanguage": "cs", "fallbackLanguage": "en", "supportedLanguages": ["cs", "en"] }
   }
   ```

   Podrobnosti k jednotlivým polím jsou v [`docs/config/config-main.md`](config/config-main.md).

2. **Volitelně přidejte** `config-licenses.json`, `config-homepage.json` a soubory
   v `html/` a `img/`. Když je vynecháte, použijí se výchozí hodnoty.

3. **Zkontrolujte, že `api.baseUrl` ukazuje na váš funkční Kramerius backend ( > API v7).**
   Bez správné adresy klient nenačte žádné dokumenty.

4. **Nasaďte** jedním ze způsobů výše:
   - **Docker:** namountujte svůj `local-config` přes volbu `-v` (nebo přes volume
     v Compose). Viz [Varianta A](#varianta-a--spuštění-přes-docker).
   - **Z projektu:** vložte soubory do `public/local-config/`, spusťte `npm run build`
     a naservírujte `dist/cdk-client/browser/`. Viz [Varianta B](#varianta-b--spuštění-z-naklonovaného-projektu).

5. **Ověřte**, že se konfigurace načetla — otevřete v prohlížeči:

   ```text
   http://<vaše-adresa>/local-config/config-main.json
   ```

   Musí vrátit váš soubor. Pokud vrátí 404, konfigurace není na správném místě.

---

## Řešení problémů

**Aplikace nenaběhne / „Chyba: konfiguráciu sa nepodarilo načítať".**
`config-main.json` chybí, není dostupný na `/local-config/config-main.json`, nebo
obsahuje neplatný JSON. Zkontrolujte umístění souboru a jeho syntaxi.

**Klient naběhne, ale nenačítá žádné dokumenty.**
Špatná nebo nedostupná adresa backendu. Zkontrolujte `api.baseUrl` v `config-main.json`
a dostupnost Krameria.

**Obrázky (autoři, žánry) na domovské stránce se nezobrazují.**
Cesty v `config-homepage.json` musí odpovídat souborům pod `local-config/img/…`.
Cesty se zapisují bez podadresáře knihovny (např. `local-config/img/authors/…`).

**Docker: změny v konfiguraci se neprojeví.**
Ověřte, že mountujete správný adresář přes `-v ./public/local-config:/usr/share/nginx/local-config:ro`
a že uvnitř leží přímo `config-main.json`. Po změně konfigurace stačí obnovit
stránku (soubory se čtou za běhu, ne při buildu image).
