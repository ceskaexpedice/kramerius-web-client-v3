# `config-licenses.json` — konfigurace licencí

Tento soubor definuje, jaké licence (= režimy přístupu k dokumentu) knihovna rozpoznává a co uživatel smí s dokumentem dané licence dělat — stáhnout PDF, tisknout, kopírovat text, zobrazit metadata atd.

Každý dokument v Krameriu má v metadatech přiřazenou jednu nebo více licencí. Tento soubor říká klientovi, jak licenci pojmenovat uživateli, jaké akce jsou povolené, a jestli se má zobrazit informační banner nebo vodoznak.

**Cesta k souboru:** `public/local-config/config-licenses.json`

> Když soubor chybí, aplikace použije vestavěný minimální seznam licencí (`public`, `dnnto`, `dnntt`, `onsite`).

> **Načítání z API.** Tento soubor lze místo z `local-config/` načítat z Kramerius API přes endpoint `/ui-config/licenses`. Lokální soubor, pokud existuje, má přednost. Viz [`guide.md` → Načítání konfigurace z API](../guide.md#načítání-konfigurace-z-api-volitelné).

---

## Kořenová struktura

```json
{
  "_defaults": {
    "actions": {}
  },
  "licenses": []
}
```

Dva bloky:

- **`_defaults.actions`** — výchozí akce aplikované na **všechny** licence. Každá licence začíná s těmito hodnotami a může je ve svém vlastním `actions` přepsat.
- **`licenses`** — pole licencí v pořadí, ve kterém se mají řadit v UI. Pořadí je významné — určuje pořadí v seznamech a filtrech.

---

## `_defaults.actions` — výchozí nastavení akcí

```json
"_defaults": {
"actions": {
"pdf": false,
"print": false,
"jpeg": false,
"text": false,
"textMode": true,
"citation": true,
"metadata": true,
"share": true,
"selection": false,
"crop": false
}
}
```

Doporučený postup: v `_defaults` nastavit restriktivní základ (nic není povolené) a konkrétní licence si pak **otevírají** jen to, co potřebují. Tím se předejde tomu, že nová licence omylem povolí všechno.

### Seznam akcí

Všechna pole jsou `true` / `false`.

| Akce | Co zapíná |
|---|---|
| `pdf` | Generování a stažení PDF z vybraného rozsahu stran. |
| `print` | Tisk stránek přes prohlížeč. |
| `jpeg` | Otevření stránky v plném rozlišení (IIIF / JPEG) v novém okně. |
| `text` | Zobrazení OCR textu stránky a zpřístupnění AI funkcí nad textem (překlad, sumarizace, transkripce). |
| `textMode` | Přepínání mezi textovým a obrázkovým režimem prohlížeče — OCR text místo skenu, případně porovnání textu s originálem vedle sebe. |
| `citation` | Generování citace dokumentu. |
| `metadata` | Zobrazení surových MODS/XML metadat dokumentu. |
| `share` | Sdílení dokumentu — odkazy, sociální sítě, embed. |
| `selection` | Obdélníkový výběr oblasti na stránce — umožňuje získat text, obrázek nebo OCR z vybrané části. |
| `crop` | Vytvoření oříznuté IIIF URL z vybrané oblasti. Funguje jen u dokumentů s IIIF tiles. |

### Jak funguje slučování s per-license `actions`

Per-license `actions` **přepisuje** pole z `_defaults`. Příklad:

`_defaults`:
```json
{ "pdf": false, "print": false, "text": false, "share": true }
```

Licence `public`:
```json
"actions": { "pdf": true, "print": true, "text": true }
```

Výsledné akce pro licenci `public`:
```json
{ "pdf": true, "print": true, "text": true, "share": true }
```

Tedy: defaultní hodnoty, přepsané tím, co je v licenci. Licence nemusí opakovat pole, která nemění.

> **Výjimka: varianty licencí.** Na [varianty podle knihovny](#varianty-licencí-podle-knihovny-cdk) (záznamy s polem `base`) se `_defaults.actions` **neaplikuje** — jejich akce se slučují nad akcemi základní licence. Viz [`actions` u variant](#actions-u-variant).

---

## `licenses[]` — jeden licenční záznam

```json
{
  "id": "dnnto",
  "accessType": "login",
  "label": {
    "cs": "Díla nedostupná na trhu - online",
    "en": "Out of Commerce Works - online",
    "sk": "Diela nedostupné na trhu - online",
    "pl": "Utwory niedostępne w handlu – online"
  },
  "actions": {
    "textMode": true,
    "citation": true,
    "metadata": true,
    "share": true
  },
  "bar": {},
  "messagePages": [],
  "instructionPage": {},
  "watermark": {}
}
```

### Povinná pole

| Pole | Povinné | Popis |
|---|---|---|
| `id` | ano | Stabilní identifikátor licence. **Musí přesně odpovídat hodnotě licence na backendu Krameria.** Když je v configu `mzk_public-contract` a v backendu `mzk_public_contract`, klient licenci nerozpozná a bude s ní zacházet jako s neznámou. |
| `accessType` | ano | Režim přístupu — `"open"`, `"login"`, nebo `"terminal"`. Viz tabulka níže. |
| `label` | ano | Lokalizovaný název licence. Zobrazuje se v UI (informace o dokumentu, seznam licencí, filtry ve vyhledávání). Doporučuje se vyplnit všechny podporované jazyky — při chybějícím překladu se použije fallback. |

### `accessType` — režimy přístupu

| Hodnota | Význam | Přístupné mimo studovnu? |
|---|---|---|
| `open` | Volně dostupné. Kdokoli vidí obsah bez jakýchkoli podmínek. | ano |
| `login` | Po přihlášení. Uživatel musí být přihlášen a případně splnit dodatečné podmínky (např. dnnto). | ano |
| `terminal` | Pouze ze studovny. Dostupné jen z IP adresy knihovního terminálu. | ne |

### Volitelná pole

| Pole | Povinné | Popis |
|---|---|---|
| `actions` | ne | Přepisy akcí nad `_defaults.actions`. Když chybí, licence zdědí jen defaulty. |
| `bar` | ne | Informační banner zobrazený nad prohlížečem. Viz níže. Když chybí, žádný banner se nezobrazí. |
| `messagePages` | ne | HTML dialogy zobrazované v různých situacích (přístup zamítnut, informace). Viz níže. Když chybí, použije se obecný systémový dialog. |
| `instructionPage` | ne | HTML stránka s návodem, jak získat přístup k dokumentu. Když chybí, tlačítko "návod" se neukáže. |
| `watermark` | ne | Vodoznak vykreslovaný přes obraz stránky. Viz níže. Když chybí, žádný vodoznak se nevykresluje. |
| `providedBy` | ne | Zařadí licenci do sekce „Poskytováno pod licencí" v metadatech dokumentu. Viz níže. Když chybí (nebo má `display: false`), licence se v této sekci nezobrazuje. |
| `base` | ne | Označuje záznam jako **variantu jiné licence pro konkrétní knihovnu** (jen v agregátoru CDK). Obsahuje `id` základní licence, kterou tento záznam přepisuje. Viz [Varianty licencí podle knihovny](#varianty-licencí-podle-knihovny-cdk). Když chybí, jde o běžnou samostatnou licenci. |

---

## `bar` — informační banner

Když má dokument licenci s nastaveným `bar`, nad prohlížečem se zobrazí lišta s logem a textem (volitelně klikací).

```json
"bar": {
"licenses": ["dnnto"],
"text": {
"cs": "Díla nedostupná na trhu - online",
"en": "Out of Commerce Works - online"
},
"logo": "/img/logo/dnnt-gray-transparent.png",
"link": "https://dnnt.cz"
}
```

| Pole | Povinné | Popis |
|---|---|---|
| `licenses` | ano | Seznam identifikátorů licencí, které banner aktivují. Obvykle obsahuje vlastní ID licence, ale dá se použít i ke sdružení více licencí pod jeden společný banner. |
| `text` | ano | Lokalizovaný text banneru. |
| `logo` | ne | Cesta nebo URL k logu zobrazenému na liště. Když chybí, zobrazí se jen text. |
| `link` | ne | URL, která se otevře po kliknutí na banner. Když chybí, banner není klikací. |

---

## `messagePages` — informační dialogy

Pole HTML stránek (dialogů) vázaných k licenci. Aplikace vybere správný text podle aktuálního stavu přístupu uživatele — nepřihlášen, přihlášen bez oprávnění, nebo má přístup.

```json
"messagePages": [
{
"key": "unauthenticated",
"page": {
"cs": "local-config/html/licenses/dnnto.cs.html",
"en": "local-config/html/licenses/dnnto.en.html"
}
},
{
"key": "unauthorized",
"page": {
"cs": "local-config/html/licenses/dnnto2.cs.html",
"en": "local-config/html/licenses/dnnto2.en.html"
}
},
{
"key": "available",
"page": {
"cs": "local-config/html/licenses/dnnto3.cs.html",
"en": "local-config/html/licenses/dnnto3.en.html"
}
}
]
```

Každá položka má:

| Pole | Povinné | Popis |
|---|---|---|
| `key` | ano | Identifikátor zprávy (viz níže obvyklé klíče). |
| `page` | ano | Cesty k HTML souborům v jednotlivých jazycích. Když chybí překlad do požadovaného jazyka, použije se fallback (`cs → en`). |

### Obvyklé klíče

Tlačítko „?" u licence vždy otevře jeden ze tří textů podle aktuálního stavu přístupu uživatele:

| Klíč | Kdy se zobrazí |
|---|---|
| `unauthenticated` | Uživatel **není přihlášen** a nemá přístup k dokumentu. Typicky: "Pro zobrazení se musíte přihlásit." |
| `unauthorized` | Uživatel **je přihlášen**, ale nesplňuje podmínky licence (např. u dnnto nemá ověřenou způsobilost). Typicky: "Váš účet nemá oprávnění pro tuto licenci." |
| `available` | Uživatel **má přístup** — dokument je pro něj dostupný. Obecné informace o licenci (co licence znamená, za jakých podmínek platí). |

HTML soubory se obvykle ukládají pod `local-config/html/licenses/`.

> **Kde se `unauthenticated` text zobrazí.** Kromě tlačítka „?" u licence se stejný text použije i na obrazovce **nedostupného dokumentu** — po kliknutí na název licence v hlavičce („Dokument je dostupný pod licencí: …"). Když licence `messagePages` s klíčem `unauthenticated` nemá, použije se obecný vestavěný text.
>
> U [variant podle knihovny](#varianty-licencí-podle-knihovny-cdk) se i tento text vybírá podle zvoleného zdroje — varianta tedy může mít vlastní `messagePages` stejně jako vlastní `instructionPage`.

---

## `instructionPage` — stránka s návodem

```json
"instructionPage": {
"cs": "local-config/html/licenses/dnnto.instruction.cs.html",
"en": "local-config/html/licenses/dnnto.instruction.en.html"
}
```

Jeden HTML soubor (per jazyk) s návodem, jak získat přístup k dokumentu pod touto licencí. Typicky něco jako "Jak se zaregistrovat do dnnto". Zobrazuje se jako samostatná stránka / dialog z tlačítka "Návod" uvnitř dialogu přístupu.

---

## Varianty licencí podle knihovny (CDK)

> Týká se **jen agregátoru CDK**. V samostatné instanci knihovny se nic nemění — když není zvolený zdroj, chová se vše přesně jako bez variant.

### Problém, který to řeší

Varianta umožňuje připojit k licenci texty pro konkrétní knihovnu. Klient pak vybere ty, které odpovídají **aktuálně zvolenému zdroji** (té členské knihovně, z níž se právě načítají data). Když pro danou knihovnu varianta neexistuje, použije se původní obecný text.

### Zápis

Varianta je běžná položka v poli `licenses` se dvěma odlišnostmi — `id` ve tvaru `<základní-licence>__<kód-knihovny>` a pole `base`:

```json
{
  "id": "onsite",
  "accessType": "terminal",
  "label": { "cs": "Studovna", "en": "Reading room" },
  "instructionPage": {
    "cs": "local-config/html/licenses/onsite.instruction.cs.html",
    "en": "local-config/html/licenses/onsite.instruction.en.html"
  },
  "actions": { "print": true, "text": true }
},
{
  "id": "onsite__mzk",
  "base": "onsite",
  "label": {
    "cs": "Studovna MZK",
    "en": "MZK reading room"
  },
  "instructionPage": {
    "cs": "local-config/html/licenses/onsite.mzk.instruction.cs.html",
    "en": "local-config/html/licenses/onsite.mzk.instruction.en.html"
  }
}
```

| Pole | Povinné | Popis |
|---|---|---|
| `id` | ano | Tvar `<base>__<kód-knihovny>`, **dvojité podtržítko**. Kód knihovny odpovídá hodnotě `cdk.collection` z API (např. `mzk`, `nkp`). |
| `base` | ano | `id` základní licence, kterou varianta přepisuje. Musí ukazovat na běžnou licenci — varianta varianty se nepodporuje. |

### Co varianta přepisuje

Varianta je **částečný přepis**, ne samostatná licence. Uvádí se v ní jen to, co se má lišit; všechno ostatní se dědí ze základní licence. Prakticky to znamená, že varianta obvykle obsahuje jen `label` a `instructionPage`, případně `messagePages` — a když se pro danou knihovnu liší i povolené akce, ještě `actions`.

| Chování | Popis |
|---|---|
| Přepisuje se | `label`, `instructionPage`, `messagePages`, `providedBy`, `bar`, `watermark` — tedy vše prezentační. |
| **Slučuje se po polích** | **`actions`** (pdf, print, text…). Viz níže — varianta může jednotlivé akce přidat nebo odebrat, ostatní zůstávají ze základní licence. |
| Dědí se | `accessType` a všechna pole, která varianta neuvádí. |

#### `actions` u variant

Akce se **neslučují jako celek, ale po jednotlivých polích**: základ tvoří `actions` základní licence a varianta nad nimi přepisuje jen ty, které uvede.

Základní licence `onsite`:
```json
"actions": { "print": true, "text": true }
```

Varianta `onsite__mzk`:
```json
"actions": { "pdf": true, "print": false }
```

Výsledek pro zvolený zdroj `mzk`:
```json
{ "pdf": true, "print": false, "text": true }
```

Tedy `pdf` varianta přidala, `print` odebrala a `text` zůstal ze základní licence.

### Kde se varianty neobjeví

Varianty jsou čistě prezentační. **Nezobrazují se ve filtrech, facetech vyhledávání ani v řazení licencí** — tam figurují pouze základní licence. Přidání varianty tedy nijak nezasáhne do vyhledávání.

### Jak se vybírá knihovna

Podle aktuálně zvoleného zdroje v detailu dokumentu — tedy té knihovny, z níž se načítají data (přepínač zdrojů v postranním panelu, případně parametr `?source=` v URL). Když uživatel zdroj přepne, texty se překreslí okamžitě.

Zvolí-li uživatel „Všechny zdroje" (na periodikách), žádná konkrétní knihovna neexistuje a použije se obecný text základní licence.

### Postup přidání knihovny

1. Vytvořte HTML soubory s texty, např. `local-config/html/licenses/onsite.nkp.instruction.cs.html` (a `.en.html`).
2. Přidejte do `licenses` záznam `{ "id": "onsite__nkp", "base": "onsite", ... }` s `label` a `instructionPage`.

---

## `providedBy` — zobrazení v sekci „Poskytováno pod licencí"

V detailu dokumentu se v metadatech zobrazuje sekce „Poskytováno pod licencí". Pole `providedBy` určuje, zda se daná licence v této sekci ukáže, a co se vedle jejího názvu vykreslí (logo a/nebo odkaz).

```json
"providedBy": {
"display": true,
"imageUrl": "/img/logo/provided-by-licenses/dnnto-logo.png",
"url": "https://dnnt.cz/"
}
```

| Pole | Povinné | Popis |
|---|---|---|
| `display` | ano | `true` = licence se v sekci zobrazuje, `false` = nezobrazuje. Pro vyloučení licence ze sekce stačí celý blok `providedBy` neuvádět. |
| `imageUrl` | ne | Cesta nebo URL k logu zobrazenému vedle názvu licence. Když chybí, vykreslí se jen text licence. |
| `url` | ne | URL, na kterou se odkazuje název licence (a logo, pokud je nastaveno). Když chybí, název ani logo nejsou klikací. |

Sekce se v UI ukáže jen tehdy, když dokument má alespoň jednu runtime licenci, jejíž config má `providedBy.display: true`. Pořadí v sekci odpovídá pořadí runtime licencí dokumentu.

---

## `watermark` — vodoznak v prohlížeči

Vodoznak se vykresluje jako překryv nad obrazem stránky. Používá se u licencí, které umožňují prohlížení, ale chtějí obraz chránit proti nekontrolovanému pořizování kopií.

Dva režimy — textový nebo obrázkový.

### Textový vodoznak

```json
"watermark": {
"type": "text",
"opacity": 0.15,
"rowCount": 3,
"colCount": 3,
"probability": 100,
"staticText": {
"cs": "Nekopírovat",
"en": "Do not copy"
},
"fontSize": 14,
"color": "rgba(0,0,0,0.5)"
}
```

### Obrázkový vodoznak

```json
"watermark": {
"type": "image",
"opacity": 0.2,
"rowCount": 2,
"colCount": 2,
"probability": 100,
"logo": "/local-config/img/watermark.png",
"scale": 1.0
}
```

### Společná pole

| Pole | Povinné | Popis | Výchozí |
|---|---|---|---|
| `type` | ano | `"text"` nebo `"image"`. | — |
| `opacity` | ne | Průhlednost 0 až 1. | `0.15` |
| `rowCount` | ne | Počet řádků mřížky vodoznaku přes stránku. | `3` |
| `colCount` | ne | Počet sloupců mřížky. | `3` |
| `probability` | ne | Pravděpodobnost 0 až 100, že se vodoznak v dané buňce mřížky vykreslí. `100` = vždy, `50` = zhruba polovina buněk. | `100` |

### Jen pro `type: "image"`

| Pole | Povinné | Popis | Výchozí |
|---|---|---|---|
| `logo` | ano | Cesta k obrázku vodoznaku. | — |
| `scale` | ne | Měřítko obrázku (`1.0` = původní velikost). | `1.0` |

### Jen pro `type: "text"`

| Pole | Povinné | Popis | Výchozí |
|---|---|---|---|
| `staticText` | ano | Lokalizovaný text vodoznaku. | — |
| `fontSize` | ne | Velikost fontu v pixelech. | `14` |
| `color` | ne | Barva textu v CSS formátu. | `rgba(0,0,0,0.5)` |

---

## Minimální příklad

```json
{
  "_defaults": {
    "actions": {
      "pdf": false,
      "print": false,
      "jpeg": false,
      "text": false,
      "textMode": true,
      "citation": true,
      "metadata": true,
      "share": true,
      "selection": false,
      "crop": false
    }
  },
  "licenses": [
    {
      "id": "public",
      "accessType": "open",
      "label": {
        "cs": "Volná díla",
        "en": "Public domain",
        "sk": "Voľné diela",
        "pl": "Domena publiczna"
      },
      "actions": {
        "pdf": true,
        "print": true,
        "jpeg": true,
        "text": true,
        "selection": true,
        "crop": true
      }
    },
    {
      "id": "onsite",
      "accessType": "terminal",
      "label": {
        "cs": "Studovna",
        "en": "Reading room",
        "sk": "Študovňa",
        "pl": "Czytelnia"
      },
      "actions": {
        "print": true,
        "text": true
      }
    },
    {
      "id": "onsite__mzk",
      "base": "onsite",
      "label": {
        "cs": "Studovna MZK",
        "en": "MZK reading room"
      },
      "instructionPage": {
        "cs": "local-config/html/licenses/onsite.mzk.instruction.cs.html",
        "en": "local-config/html/licenses/onsite.mzk.instruction.en.html"
      }
    }
  ]
}
```

> Poslední záznam je [varianta podle knihovny](#varianty-licencí-podle-knihovny-cdk) — uplatní se jen v CDK, když je zvolený zdroj `mzk`.

---

## Související

- [`config-main.json — hlavní konfigurační soubor`](https://github.com/ceskaexpedice/kramerius-web-client-v3/wiki/Hlavn%C3%AD-konfigura%C4%8Dn%C3%AD-soubor)
- [`config-homepage.json — obsah domovské stránky`](https://github.com/ceskaexpedice/kramerius-web-client-v3/wiki/Konfigurace-%C3%BAvodn%C3%AD-strany)
