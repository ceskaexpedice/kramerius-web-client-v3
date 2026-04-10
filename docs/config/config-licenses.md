# `config-licenses.json` — konfigurace licencí

Tento soubor definuje, jaké licence (= režimy přístupu k dokumentu) knihovna rozpoznává a co uživatel smí s dokumentem dané licence dělat — stáhnout PDF, tisknout, kopírovat text, zobrazit metadata atd.

Každý dokument v Krameriu má v metadatech přiřazenou jednu nebo více licencí. Tento soubor říká klientovi, jak licenci pojmenovat uživateli, jaké akce jsou povolené, a jestli se má zobrazit informační banner nebo vodoznak.

**Cesta k souboru:** `public/local-config/{kód-knihovny}/config-licenses.json`

> Když soubor chybí, aplikace použije vestavěný minimální seznam licencí (`public`, `dnnto`, `dnntt`, `onsite`).

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
      "cs": "local-config/mzk/html/licenses/dnnto.cs.html",
      "en": "local-config/mzk/html/licenses/dnnto.en.html"
    }
  },
  {
    "key": "unauthorized",
    "page": {
      "cs": "local-config/mzk/html/licenses/dnnto2.cs.html",
      "en": "local-config/mzk/html/licenses/dnnto2.en.html"
    }
  },
  {
    "key": "available",
    "page": {
      "cs": "local-config/mzk/html/licenses/dnnto3.cs.html",
      "en": "local-config/mzk/html/licenses/dnnto3.en.html"
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

HTML soubory se obvykle ukládají pod `local-config/{kód}/html/licenses/`.

---

## `instructionPage` — stránka s návodem

```json
"instructionPage": {
  "cs": "local-config/mzk/html/licenses/dnnto.instruction.cs.html",
  "en": "local-config/mzk/html/licenses/dnnto.instruction.en.html"
}
```

Jeden HTML soubor (per jazyk) s návodem, jak získat přístup k dokumentu pod touto licencí. Typicky něco jako "Jak se zaregistrovat do dnnto". Zobrazuje se jako samostatná stránka / dialog z tlačítka "Návod" uvnitř dialogu přístupu.

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
  "logo": "/local-config/mzk/img/watermark.png",
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
    }
  ]
}
```

---

## Související

- [`config-main.md`](config-main.md) — hlavní konfigurace
- [`config-homepage.md`](config-homepage.md) — domovská stránka
