# `config-main.json` — hlavní konfigurační soubor

Hlavní konfigurační soubor klienta. Říká aplikaci, jak se jmenuje knihovna, kam se připojit, jaké funkce má zapnuté a jak vypadá prohlížeč dokumentů.

Každá knihovní instance (MZK, KNAV, CDK…) má vlastní adresář pod `public/local-config/{kód-knihovny}/` a v něm svůj `config-main.json`.

**Cesta k souboru:** `public/local-config/{kód-knihovny}/config-main.json`

> Když některý blok v souboru chybí, použije se výchozí hodnota popsaná u jednotlivých sekcí níže. Když se celý soubor nepodaří načíst nebo naparsovat, aplikace naběhne s vestavěnými defaulty.

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
  "viewer": {},
  "search": {},
  "pages": []
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
  "adminClientUrl": "https://admin.kramerius.mzk.cz"
}
```

| Pole | Povinné | Popis |
|---|---|---|
| `code` | ano | Krátký kód knihovny (`mzk`, `cdk`, `knav`…). Musí odpovídat názvu adresáře pod `local-config/`. |
| `name` | ano | Zobrazovaný název knihovny. Může být jeden řetězec, nebo lokalizovaný text. |
| `contactEmail` | ano | Kontaktní e-mail zobrazovaný v patičce a na chybových stránkách. |
| `logo` | ne | Cesta k logu knihovny. Obvykle `/favicon.svg` nebo cesta pod `local-config/{kód}/img/`. Když chybí, zobrazí se výchozí logo. |
| `adminClientUrl` | ne | URL administrátorského rozhraní. Používá se jako cíl přesměrování z administrátorského dialogu do admin klienta. Když chybí, odkaz na admin rozhraní není dostupný. |

---

## `api` — připojení k backendu

```json
"api": {
  "baseUrl": "https://api.kramerius.mzk.cz",
  "citationUrl": "https://citace.ceskadigitalniknihovna.cz/api/v1"
}
```

| Pole | Povinné | Popis |
|---|---|---|
| `baseUrl` | ano | Základní URL Kramerius API backendu. |
| `citationUrl` | ne | URL citační služby. Používá se při generování citací dokumentů. Když chybí, použije se výchozí `https://citace.ceskadigitalniknihovna.cz/api/v1`. |

---

## `i18n` — jazyky

```json
"i18n": {
  "defaultLanguage": "cs",
  "fallbackLanguage": "en",
  "supportedLanguages": ["cs", "en", "sk", "pl"]
}
```

| Pole | Povinné | Popis | Výchozí |
|---|---|---|---|
| `defaultLanguage` | ano | Výchozí jazyk při prvním otevření aplikace. | `cs` |
| `fallbackLanguage` | ano | Záchranný jazyk, když v lokalizovaném textu chybí požadovaný překlad. | `en` |
| `supportedLanguages` | ano | Jazyky nabízené v přepínači jazyka v hlavičce. | `["cs", "en", "sk", "pl"]` |

Jazykové kódy jsou dvouznaková ISO označení (`cs`, `en`, `sk`, `pl`, `de`…).

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
| `provider` | ne | Aktuálně `"ga4"` (Google Analytics 4). |
| `enabled` | ano | Hlavní přepínač analytiky. Když je `false`, žádné eventy se neposílají bez ohledu na ostatní pole. |
| `measurementId` | ne | GA4 Measurement ID ve formátu `G-XXXXXXXXXX`. Když chybí a `enabled: true`, analytika nebude fungovat. |

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
  "georef": true,
  "ai": false,
  "folders": true,
  "librarySwitch": false
}
```

Přepínače hlavních funkcí. Všechna pole jsou `true` / `false`.

| Pole | Co zapíná | Výchozí |
|---|---|---|
| `keycloak` | Přihlašování přes Keycloak (OAuth/OIDC). Když je `false`, uživatelský profil a oblíbené jsou skryté. | `true` |
| `mapSearch` | Mapové vyhledávání dokumentů podle geografických souřadnic. Vyžaduje zapnutý `googleMaps`. | `true` |
| `georef` | Zobrazení georeferencovaných map přímo v prohlížeči. | `true` |
| `ai` | AI funkce v postranním panelu detailu dokumentu (shrnutí, překlady, doplňující informace). | `true` |
| `folders` | Uživatelské složky / oblíbené dokumenty. Vyžaduje zapnutý `keycloak`. | `true` |
| `librarySwitch` | Přepínač knihoven v hlavičce. | `true` |

Když některé pole chybí a celý blok `features` **není** v configu, použijí se výchozí hodnoty z tabulky. Pokud blok `features` **je** v configu, ale konkrétní pole v něm chybí, funkce bude **zapnuta** (`true`).

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
  ]
}
```

| Pole | Povinné | Popis |
|---|---|---|
| `doctypes` | ne | Seznam typů dokumentů, které se mají brát v úvahu při vyhledávání (omezení modelů). Hodnoty musí odpovídat typům uloženým v backendu Krameria. Když pole chybí nebo je prázdné, nefiltruje se podle modelu — pracuje se se všemi typy, které backend vrací. |

---

## `pages` — statické obsahové stránky

Pole stránek dostupných v aplikaci (O projektu, Podmínky užití, GDPR, FAQ…). HTML obsah stránek je v samostatných souborech pod `local-config/{kód}/html/`.

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
      "cs": "local-config/mzk/html/about/about.cs.html",
      "en": "local-config/mzk/html/about/about.en.html"
    },
    "showInHeader": true
  },
  {
    "id": "terms",
    "content": {
      "cs": [
        "local-config/mzk/html/terms/terms.cs.html",
        "local-config/mzk/html/terms/terms2.cs.html"
      ],
      "en": [
        "local-config/mzk/html/terms/terms.en.html",
        "local-config/mzk/html/terms/terms2.en.html"
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

> **Poznámka:** Bloky `features`, `ui`, `viewer`, `integrations`, `search` a `pages` jsou volitelné. Když celý blok chybí, použijí se výchozí hodnoty (viz jednotlivé sekce výše). Merge probíhá na úrovni celého bloku — pokud blok uvedete pouze částečně, chybějící pole `features` se chovají jako `true` (funkce zapnuta). Pokud chcete funkci vypnout, musíte ji explicitně nastavit na `false`.

---

## Související

- [`config-licenses.md`](config-licenses.md) — licence a práva k dokumentům
- [`config-homepage.md`](config-homepage.md) — obsah domovské stránky
