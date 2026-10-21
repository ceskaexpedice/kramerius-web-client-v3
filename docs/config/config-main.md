# `config-main.json` — hlavní konfigurační soubor

Hlavní konfigurační soubor klienta. Říká aplikaci, jak se jmenuje knihovna, kam se připojit, jaké funkce má zapnuté a jak vypadá prohlížeč dokumentů.

Klient se vždy nastavuje na **jednoho jediného Krameria**. Adresu backendu i veškeré chování určuje pouze tento konfigurační soubor.

Konfigurace knihovny leží přímo v adresáři `public/local-config/`. Kód knihovny určuje pole [`app.code`](#app--identita-knihovny) v tomto souboru. Adresu Kramerius API backendu, na který se klient připojí, řídí pole [`api.baseUrl`](#api--připojení-k-backendu).

**Cesta k souboru:** `public/local-config/config-main.json`

> Když některý blok v souboru chybí, použije se výchozí hodnota popsaná u jednotlivých sekcí níže. Když se `config-main.json` vůbec nepodaří načíst nebo naparsovat, aplikace **nenaběhne** a zobrazí chybu konfigurace.

> **Načítání z API.** Tento soubor lze místo z `local-config/` načítat z Kramerius API přes endpoint `/ui-config/general` (stejný tvar, žádná transformace). Pokud lokální soubor existuje, má přednost před API. Načítání z API se zapíná nastavením `APP_API_CONFIG_BASE_URL` (base URL API). Podrobnosti viz [`guide.md` → Načítání konfigurace z API](../guide.md#načítání-konfigurace-z-api-volitelné).

---

## Kořenová struktura

```json
{
  "app": {},
  "api": {},
  "i18n": {},
  "integrations": {},
  "features": {},
  "ui": {},
  "export": {},
  "locks": {},
  "viewer": {},
  "search": {},
  "pages": [],
  "footer": {}
}
```

Licence a obsah domovské stránky mají vlastní soubory (`config-licenses.json`, `config-homepage.json`) s vlastní dokumentací.

---

## Lokalizované texty

Kdekoli je v dokumentaci řeč o "lokalizovaném textu", myslí se tím tento formát:

```json
{
  "cs": "Moravská zemská knihovna",
  "en": "Moravian Library",
  "sk": "Moravská zemská knižnica",
  "pl": "Morawska Biblioteka Krajowa"
}
```

Když chybí překlad pro zvolený jazyk, použije se fallback — jazyky se zkoušejí v pořadí `požadovaný → cs → en`, případně se vezme první dostupná hodnota.

---

## `app` — branding a kontakty

```json
"app": {
"code": "mzk",
"name": {
"cs": "Moravská zemská knihovna",
"en": "Moravian Library",
"sk": "Moravská zemská knižnica",
"pl": "Morawska Biblioteka Krajowa"
},
"contactEmail": "digitalniknihovna@mzk.cz",
"logo": "/favicon.svg",
"logoDark": "/local-config/img/logo-dark.svg",
"adminClientUrl": "https://admin.kramerius.mzk.cz"
}
```

| Pole | Povinné | Popis |
|---|---|---|
| `code` | ano | Krátký kód knihovny (`mzk`, `cdk`, `knav`…). Slouží jako identita instance. |
| `name` | ano | Zobrazovaný název knihovny. Může být jeden řetězec, nebo lokalizovaný text. |
| `contactEmail` | ano | Kontaktní e-mail zobrazovaný na chybových stránkách. |
| `logo` | ne | Cesta k logu knihovny — např. `/img/logo.svg` nebo cesta pod `local-config/img/`. Když chybí, **v hlavičce se nezobrazí žádné logo**. Klient nikdy nedoplňuje náhradní logo (dříve se v takovém případě podstrčilo logo CDK nebo `/favicon.svg`), takže nasazení bez loga nikdy neukáže cizí značku. |
| `logoDark` | ne | Cesta k variantě loga pro tmavý režim. Když chybí, použije se v tmavém režimu logo z `logo`. Když se soubor nepodaří načíst, klient se rovněž vrátí k `logo`; pokud ani ten není nastavený, obrázek se skryje. |
| `adminClientUrl` | ne | URL administrátorského rozhraní. Používá se jako cíl přesměrování z administrátorského dialogu do admin klienta. Když chybí, odkaz na admin rozhraní není dostupný. |

---

## `api` — připojení k backendu

```json
"api": {
  "baseUrl": "https://api.kramerius.mzk.cz",
  "citationUrl": "https://citace.ceskadigitalniknihovna.cz/api/v1",
  "georefUrl": "https://api.georeference.trinera.cloud/georefs/latest",
  "aiProxyUrl": "https://api.trinera.cloud/api"
}
```

| Pole | Povinné | Popis |
|---|---|---|
| `baseUrl` | ano | Základní URL Kramerius API backendu — **jediný zdroj pravdy** pro to, na jakého Krameria je klient připojen. Klient odsud odvozuje všechny API požadavky (`{baseUrl}/search/api/client/v7.0/…`). Hodnota může být uvedena buď bez cesty (`https://api.kramerius.example.org`), nebo včetně `/search/api/client` (`https://api.kramerius.example.org/search/api/client`) — obojí se normalizuje na stejný výsledek. |
| `citationUrl` | ne | URL citační služby. Používá se při generování citací dokumentů. Když chybí, použije se výchozí `https://citace.ceskadigitalniknihovna.cz/api/v1`. |
| `georefUrl` | ne | Základní URL služby s georeferenčními anotacemi (Allmaps anotace). Aktivní jen když `features.georef: true`. Když chybí, georeferenční zobrazení se nikdy nenabídne. Výchozí `https://api.georeference.trinera.cloud/georefs/latest`. |
| `aiProxyUrl` | ne | Základní URL AI proxy služby (shrnutí, překlady, předčítání). Aktivní jen když `features.ai: true`. Když chybí, **žádná výchozí adresa se nedoplňuje** — AI požadavky se nikam neodešlou. Klient tedy nikdy nevolá cizí službu, kterou si nasazení výslovně nenastavilo. |

---

## `i18n` — jazyky

```json
"i18n": {
  "defaultLanguage": "cs",
  "fallbackLanguage": "en",
  "supportedLanguages": ["cs", "en", "sk", "pl", "de", "et", "hu", "lt", "pt", "sl", "sv", "zh-CN", "zh-TW"]
}
```

| Pole | Povinné | Popis | Výchozí |
|---|---|---|---|
| `defaultLanguage` | ano | Výchozí jazyk při prvním otevření aplikace. | `cs` |
| `fallbackLanguage` | ano | Záchranný jazyk, když v lokalizovaném textu chybí požadovaný překlad. | `en` |
| `supportedLanguages` | ano | Jazyky nabízené v přepínači jazyka v hlavičce. Uveďte jen ty, které chcete čtenářům nabídnout — překlady jsou dodané pro všechny níže uvedené. | `["cs", "en", "sk", "pl", "de", "et", "hu", "lt", "pt", "sl", "sv", "zh-CN", "zh-TW"]` |

Jazykové kódy jsou dvouznaková ISO označení (`cs`, `en`, `sk`, `pl`, `de`…); výjimkou jsou varianty čínštiny `zh-CN` (zjednodušená) a `zh-TW` (tradiční).

Dodané překlady: `cs`, `en`, `sk`, `pl`, `de`, `et`, `hu`, `lt`, `pt`, `sl`, `sv`, `zh-CN`, `zh-TW`. Jazyk, který v `supportedLanguages` neuvedete, se v přepínači nezobrazí, i když jeho soubory existují. Jazyky mimo `cs`/`sk` používají při chybějícím klíči záložní jazyk `en`.

> **Poznámka k překladům:** jazyky doplněné nad rámec původní čtveřice (`de`, `et`, `hu`, `lt`, `pt`, `sl`, `sv`, `zh-CN`, `zh-TW`) vznikly strojovým překladem. Odborná knihovnická terminologie (`relators/`, `access_denied/`, `codetables/`) by před nasazením měla projít korekturou rodilého mluvčího.

---

## `integrations` — externí služby

Celý blok je volitelný. Když chybí, všechny integrace se tiše vypnou.

```json
"integrations": {
  "clientId": "",
  "analytics": {
    "provider": "ga4",
    "enabled": true,
    "measurementId": "G-XXXXXXXXXX"
  },
  "googleMaps": {
    "enabled": true,
    "apiKey": "..."
  }
}
```

### `analytics`

| Pole | Povinné | Popis |
|---|---|---|
| `provider` | ne | Aktuálně `"ga4"` (Google Analytics 4). Jiná hodnota analytiku vypne. |
| `enabled` | ne | Hlavní přepínač analytiky. `false` vypne analytiku úplně, včetně fallbacku podle hostname. Když pole (nebo celý blok `analytics`) chybí, rozhoduje samotné měření — viz pořadí níže. |
| `measurementId` | ne | GA4 Measurement ID ve formátu `G-XXXXXXXXXX`. Když chybí, použije se fallback podle hostname (viz níže) a na ostatních doménách se analytika nenačte. Ukázková hodnota `G-XXXXXXXXXX` se bere jako nevyplněná. |

Skript GA se načítá až po načtení konfigurace (při startu aplikace). Měření se hledá v tomto pořadí:

1. `measurementId` z konfigurace,
2. fallback podle hostname — jen pro testovací nasazení `cdk.test.trinera.cloud` a `cdk.app.trinera.cloud` (včetně subdomén).

Konfigurace má vždy přednost: když je `measurementId` vyplněné, hostname se neřeší. `enabled: false` vypne analytiku i na těch dvou doménách. Fallback je čistě pro pohodlí našich testovacích instancí, aby nemusely nosit analytiku v konfigu — běžná instance si měření nastavuje výhradně přes `measurementId`.

### `googleMaps`

| Pole | Povinné | Popis |
|---|---|---|
| `enabled` | ano | Povoluje Google Maps. Používá se v mapovém vyhledávání a při zobrazení geolokovaných dokumentů. |
| `apiKey` | ne | Google Maps API klíč. Když chybí a `enabled: true`, mapy se nenačtou. |

### `clientId`

Volitelný anonymní identifikátor klienta, který se posílá do analytiky / backendu. Když se nepoužívá, může zůstat prázdný nebo se pole vynechá úplně.

---

## `features` — zapínání funkcí

```json
"features": {
  "keycloak": true,
  "mapSearch": true,
  "mapProvider": "google",
  "georef": true,
  "ai": false,
  "folders": true,
  "showExportHistory": false
}
```

Přepínače hlavních funkcí. Všechna pole jsou `true` / `false`.

| Pole | Co zapíná | Výchozí |
|---|---|---|
| `keycloak` | Přihlašování přes Keycloak (OAuth/OIDC). Když je `false`, uživatelský profil a oblíbené jsou skryté. | `true` |
| `mapSearch` | Mapové vyhledávání dokumentů podle geografických souřadnic. Při `mapProvider: "google"` vyžaduje zapnutý `googleMaps`. | `true` |
| `mapProvider` | Poskytovatel podkladové mapy pro mapové vyhledávání. `"google"` = Google Maps (vyžaduje `integrations.googleMaps.apiKey`), `"allmaps"` = `@allmaps/viewer-lite` s OSM podkladem (bez API klíče). | `"google"` |
| `georef` | Zobrazení georeferencovaných map přímo v prohlížeči. Pro funkční zobrazení musí být zároveň vyplněné `api.georefUrl`. Když je `false`, tlačítko „Zobrazení na mapě“ se v detailu dokumentu vůbec nenabízí. | `true` |
| `ai` | AI funkce v postranním panelu detailu dokumentu (shrnutí, překlady, doplňující informace). | `true` |
| `folders` | Uživatelské složky / oblíbené dokumenty. Vyžaduje zapnutý `keycloak`. | `true` |
| `showExportHistory` | Položka „Historie stahování“ v uživatelském menu. Na rozdíl od ostatních přepínačů je tato funkce **opt-in** — výchozí hodnota je `false`. | `false` |

Když některé pole chybí a celý blok `features` **není** v configu, použijí se výchozí hodnoty z tabulky. Pokud blok `features` **je** v configu, ale konkrétní pole v něm chybí, funkce bude **zapnuta** (`true`) — **výjimkou** je `showExportHistory`, které zůstává vypnuté (`false`), pokud ho výslovně nezapnete.

---

## `ui`

```json
"ui": {
  "cookiebar": true
}
```

| Pole | Povinné | Popis | Výchozí |
|---|---|---|---|
| `cookiebar` | ne | Zda zobrazit cookie lištu při první návštěvě. | `true` |

---

## `locks` — zámkové licence

Dokument pod zámkovou licencí může současně číst jen omezený počet čtenářů. Klient si zámek vyžádá sám, když ho `items/{pid}/info` nabídne v `accessibleLocks`, a průběžně ho obnovuje. Aby nečinný čtenář neblokoval místo dalším, po `idleTimeoutSec` bez jakéhokoli vstupu (myš, klávesnice, scroll, dotyk) se zámek uvolní. Posledních `warningSec` sekund běží dialog s odpočtem a tlačítkem „Pokračovat ve čtení“. Čas ve skryté záložce se počítá jako nečinnost.

```json
"locks": {
  "idleTimeoutSec": 600,
  "warningSec": 60
}
```

| Pole | Povinné | Popis | Výchozí |
|---|---|---|---|
| `idleTimeoutSec` | ne | Po kolika sekundách nečinnosti se zámek uvolní pro dalšího čtenáře. | `600` |
| `warningSec` | ne | Kolik sekund před uvolněním se zobrazí dialog s odpočtem. Má být menší než `idleTimeoutSec`. | `60` |

Chybějící blok nebo pole se doplní výchozí hodnotou. Pokud je zapnutý interní přepínač knihoven (`features.librarySwitch`), platí `locks` ze základního `config-main.json` i pro přepnutou knihovnu.

### Chování klienta

- **Žádná licence není natvrdo v kódu.** Zámkovou licencí je každá, kterou backend vrátí v `accessibleLocks` (např. `kkvhb_zamek`). Když jich nabídne víc, klient je zkouší postupně, dokud nějaký zámek nezíská. Vlastní název a texty licence se nastavují v `config-licenses.json` jako u ostatních licencí; jinak se zobrazí obecné „Omezený přístup“.
- **Obnovování.** Zámek se obnovuje každou polovinu `refreshInterval`, který vrací backend.
- **Uvolnění.** Zámek se uvolní při odchodu z dokumentu (i přímo na jiný dokument), při zavření nebo opuštění záložky a po nečinnosti. Když je dokument otevřený ve více záložkách téže session, uvolní se až po zavření poslední z nich. Po návratu tlačítkem Zpět (stránka obnovená z cache prohlížeče) se zámek získá znovu.
- **Obsazeno.** Když jsou všechna místa obsazená (409), zobrazí se místo dokumentu hláška s tlačítkem „Zkusit znovu“. Po uvolnění pro nečinnost se zobrazí hláška s tlačítkem „Znovu získat přístup“; automaticky se zámek znovu nezíská.

### Vztah k nastavení backendu

Samotné parametry zámku se nastavují v administraci Krameria u každé zámkové licence zvlášť, ne v klientovi:

| Parametr backendu | Význam |
|---|---|
| `refreshInterval` | Do kolika sekund od posledního obnovení zámek vyprší, pokud ho klient neobnoví. |
| `maxInterval` | Maximální životnost jednoho zámku od vytvoření (v odpovědi jako `maxTime`). Po vypršení backend při dalším obnovení vytvoří nový zámek, pokud je volné místo, takže aktivní čtenář pokračuje bez přerušení. |
| `maxReaders` | Kolik čtenářů může mít zámek současně; nad limit backend vrací 409. |

`idleTimeoutSec` má smysl jen tehdy, když je kratší než `maxInterval` licence. Jinak zámek dřív obnoví backend a uvolnění pro nečinnost nikdy nenastane.

---

## `export` — formáty exportu dokumentu

Přepínače jednotlivých formátů v sekci „Export“ v postranním panelu detailu dokumentu. Když některý formát instance nenabízí (např. nechce EPUB), nastaví se na `false` a jeho dlaždice se v sekci exportu nezobrazí.

```json
"export": {
  "print": true,
  "jpeg": true,
  "pdf": true,
  "epub": true,
  "txt": true,
  "enrichWithAI": true
}
```

| Pole | Co zapíná | Výchozí |
|---|---|---------|
| `print` | Tisk dokumentu (celý dokument / výběr stran). | `true`  |
| `jpeg` | Export stránky jako JPEG (aktuální strana / výřez). | `true`  |
| `pdf` | Export do PDF (celý dokument / výběr stran / odeslání e-mailem). | `true`  |
| `epub` | Export do EPUB. | `true`  |
| `txt` | Export do prostého textu (TXT). | `true`  |
| `enrichWithAI` | Přepínač „obohatit pomocí AI“ v dialogu pro odeslání EPUB/TXT exportu e-mailem. Když je `false`, přepínač se v dialogu nezobrazí. Není to samostatný formát exportu — neovlivňuje skrytí záložky „Export“. | `true`  |

Když se celý blok `export` vynechá, použijí se výchozí hodnoty z tabulky (`print`, `jpeg`, `pdf` zapnuté; `epub`, `txt` vypnuté). Když blok uvedete, ale některé pole vynecháte, doplní se z výchozích hodnot.

> **Když jsou všechny formáty `false`, celá záložka „Export“ se v postranním panelu skryje.**

---

## `viewer` — prohlížeč dokumentů

```json
"viewer": {
  "defaultMode": "book",
  "availableModes": ["book", "single"],
  "rememberLastMode": true,
  "controls": {},
  "selectionControls": {}
}
```

| Pole | Povinné | Popis | Výchozí |
|---|---|---|---|
| `defaultMode` | ano | Výchozí režim — `"book"` (dvě strany vedle sebe) nebo `"single"` (jedna strana). | `book` |
| `availableModes` | ano | Povolené režimy. Když obsahuje jen jednu hodnotu, přepínač režimu se skryje. | `["book", "single"]` |
| `rememberLastMode` | ne | Zda si pamatovat poslední volbu uživatele mezi návštěvami. | `true` |

### `viewer.controls` — tlačítka na liště prohlížeče

```json
"controls": {
  "zoomIn": true,
  "zoomOut": true,
  "fullscreen": true,
  "fitToScreen": true,
  "fitToWidth": true,
  "scrollMode": true,
  "bookMode": true,
  "rotate": true,
  "selectArea": true
}
```

| Pole | Tlačítko |
|---|---|
| `zoomIn` / `zoomOut` | Lupa + / − |
| `fullscreen` | Celá obrazovka |
| `fitToScreen` | Přizpůsobit obrazovce |
| `fitToWidth` | Přizpůsobit šířce |
| `scrollMode` | Režim plynulého rolování |
| `bookMode` | Režim knihy (dvě strany vedle sebe) |
| `rotate` | Otočení stránky |
| `selectArea` | Výběr oblasti na stránce (pro citování / výřez) |

Výchozí hodnota pro každé pole je `true`. Když se celý blok `controls` vynechá, zobrazí se všechna tlačítka. Když se vynechá jen některé pole, to konkrétní tlačítko se zobrazí (chybějící pole = `true`).

### `viewer.selectionControls` — co lze dělat s výběrem textu

```json
"selectionControls": {
  "text": true,
  "export": true,
  "share": true
}
```

| Pole | Akce | Výchozí |
|---|---|---|
| `text` | Kopírování textu do schránky | `true` |
| `export` | Export výběru jako JPEG | `true` |
| `share` | Sdílení výběru odkazem | `true` |

---

## `search` — vyhledávání

```json
"search": {
  "doctypes": [
    "monograph",
    "monographunit",
    "periodical",
    "periodicalvolume",
    "periodicalitem",
    "article",
    "map",
    "graphic",
    "manuscript",
    "archive",
    "sheetmusic",
    "soundrecording",
    "supplement",
    "convolute",
    "collection",
    "page"
  ],
  "facetThreads": -1
}
```

| Pole | Povinné | Popis |
|---|---|---|
| `doctypes` | ne | Seznam typů dokumentů, které se mají brát v úvahu při vyhledávání (omezení modelů). Hodnoty musí odpovídat typům uloženým v backendu Krameria. Když pole chybí nebo je prázdné, nefiltruje se podle modelu — pracuje se se všemi typy, které backend vrací. |
| `facetThreads` | ne | Hodnota Solr parametru `facet.threads` — paralelizuje výpočet facetů přes jednotlivá facetová pole. Když pole chybí nebo má neplatnou hodnotu, použije se výchozí **`-1`** (`facet.threads` se vždy posílá). `-1` = jedno vlákno na každé facetové pole (maximální paralelizace), kladné číslo = strop počtu vláken. Má smysl, protože vyhledávání facetuje více polí najednou. |

---

## `pages` — statické obsahové stránky

Pole stránek dostupných v aplikaci (O projektu, Podmínky užití, GDPR, FAQ…). HTML obsah stránek je v samostatných souborech pod `local-config/html/`.

```json
"pages": [
  {
    "id": "about",
    "label": {
      "cs": "O projektu",
      "en": "About",
      "sk": "O projekte",
      "pl": "O projekcie"
    },
    "content": {
      "cs": "local-config/html/about/about.cs.html",
      "en": "local-config/html/about/about.en.html"
    },
    "showInHeader": true
  },
  {
    "id": "terms",
    "content": {
      "cs": [
        "local-config/html/terms/terms.cs.html",
        "local-config/html/terms/terms2.cs.html"
      ],
      "en": [
        "local-config/html/terms/terms.en.html",
        "local-config/html/terms/terms2.en.html"
      ]
    }
  }
]
```

| Pole | Povinné | Popis |
|---|---|---|
| `id` | ano | Stabilní identifikátor stránky. Používá se v URL `/pages/{id}`. Obvyklé hodnoty: `about`, `terms`, `copyright`, `gdpr`, `faq`. |
| `label` | ne | Lokalizovaný název v navigaci. Když chybí, stránka se **nezobrazí v hlavičce**, ale je stále dostupná na své URL. |
| `content` | ano | Cesty k HTML souborům s obsahem, podle jazykových variant. Hodnota může být:<br>• jeden řetězec (`"cs": "cesta.html"`)<br>• **pole řetězců** (`"cs": ["část1.html", "část2.html"]`) — HTML soubory se pak spojí za sebou. Hodí se u dlouhých dokumentů (např. podmínek) rozdělených na víc fragmentů. |
| `showInHeader` | ne | Zda se stránka má objevit v navigační liště. Výchozí `false`. Stránky bez `label` jsou z navigace vyfiltrované automaticky. |

Když chybí překlad pro zvolený jazyk, použije se fallback (`cs → en`). Když chybí i fallback, stránka zobrazí prázdný obsah.

**Typické stránky:** `about`, `terms`, `copyright`, `gdpr`, `faq`. Identifikátor `id` by měl být stabilní — změna znamená změnu URL.

---

## `footer` — patička

Patička se vykresluje z **lokalizovaného HTML souboru**, podobně jako obsahové stránky (`pages`). Pro každý jazyk se uvede cesta k HTML souboru; při přepnutí jazyka se patička načte znovu z odpovídajícího souboru. Když pro zvolený jazyk soubor není, použije se fallback řetězec (`požadovaný → cs → en`).

```json
"footer": {
  "cs": "local-config/html/footer/footer.cs.html",
  "en": "local-config/html/footer/footer.en.html"
}
```

| Pole | Povinné | Popis |
|---|---|---|
| `{kód jazyka}` | ano | Cesta k HTML souboru patičky pro daný jazyk (relativní pod `public/` nebo absolutní URL). Klíčem je kód jazyka (`cs`, `en`, `sk`, `pl`…). |

### Obsah HTML souboru

HTML soubor obsahuje kompletní markup patičky i jeho stylování. Styly se vkládají přímo do souboru jako `<style>` blok — díky tomu je každá patička přenositelná (zkopírujete soubor, upravíte markup i styly na jednom místě, nasměrujete na něj config). Doporučuje se obalit pravidla vlastní třídou (např. `.cdk-footer`), aby styly neunikaly mimo patičku.

### Žádná patička

Když blok `footer` chybí (nebo se pro zvolený jazyk ani přes fallback nenajde soubor), **patička se nevykreslí**. Výchozí konfigurace ani dodávané configy (`cdk`, `mzk`) žádnou patičku nedefinují — patička se zobrazí jen tehdy, když ji explicitně nakonfigurujete.

---

## Minimální config

Nejmenší validní konfigurace — všechno ostatní se doplní z výchozích hodnot:

```json
{
  "app": {
    "code": "demo",
    "name": "Demo Library",
    "contactEmail": "admin@example.org"
  },
  "api": {
    "baseUrl": "https://api.demo.example.org"
  },
  "i18n": {
    "defaultLanguage": "cs",
    "fallbackLanguage": "en",
    "supportedLanguages": ["cs", "en"]
  }
}
```

> **Poznámka:** Bloky `features`, `ui`, `export`, `viewer`, `integrations`, `search`, `pages` a `footer` jsou volitelné. Když celý blok chybí, použijí se výchozí hodnoty (viz jednotlivé sekce výše) — výjimkou je `footer`, který výchozí hodnotu nemá, takže při jeho vynechání se patička nevykreslí. Merge probíhá na úrovni celého bloku — pokud blok uvedete pouze částečně, chybějící pole `features` se chovají jako `true` (funkce zapnuta). Pokud chcete funkci vypnout, musíte ji explicitně nastavit na `false`.

---
## Související

- [`config-licenses.json — konfigurace licencí`](https://github.com/ceskaexpedice/kramerius-web-client-v3/wiki/Konfigurace-licenc%C3%AD)
- [`config-homepage.json — obsah domovské stránky
`](https://github.com/ceskaexpedice/kramerius-web-client-v3/wiki/Konfigurace-%C3%BAvodn%C3%AD-strany)
