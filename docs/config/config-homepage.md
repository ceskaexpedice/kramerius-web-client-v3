# `config-homepage.json` — obsah domovské stránky

Tento soubor definuje, co uživatel uvidí po otevření kořenové URL (`/`) — hlavní nadpis, podnadpis a pořadí sekcí (navrhované tagy, výběr dokumentů, dlaždice s kategoriemi…).

Sekce se na stránce vykreslují **v pořadí, ve kterém jsou v souboru**. Když se položka v `sections[]` přesune, přesune se i na stránce.

**Cesta k souboru:** `public/local-config/{kód-knihovny}/config-homepage.json`

> Pokud soubor chybí, aplikace naběhne s minimálním výchozím setem čtyř sekcí:
> - **`periodicals`** — vykreslí periodika z API,
> - **`books`** — knihy z API,
> - **`genres`** — žánry z API,
> - **`document-types`** — typy dokumentů z API.

<!-- [SCREENSHOT: celkový pohled na MZK homepage — hero + první dvě sekce] -->

---

## Kořenová struktura

```json
{
  "title": {
    "cs": "Moravská zemská knihovna",
    "en": "Moravian Library",
    "sk": "Moravská zemská knižnica",
    "pl": "Morawska Biblioteka Krajowa"
  },
  "subtitle": {
    "cs": "Hledáte historické knihy, noviny, mapy nebo rukopisy? ...",
    "en": "Looking for historical books, ..."
  },
  "sections": []
}
```

| Pole | Povinné | Popis |
|---|---|---|
| `title` | ne | Hlavní nadpis v hero oblasti domovské stránky. Lokalizovaný text. Pokud chybí, použije se název knihovny z hlavní konfigurace (`app.name` v `config-main.json`). |
| `subtitle` | ne | Podnadpis / krátký popis (1–3 věty). Lokalizovaný text. Pokud chybí, nezobrazí se nic. |
| `sections` | ano | Pole sekcí v pořadí vykreslení. Pokud je prázdné `[]`, stránka bude mít jen hero. |

<!-- [SCREENSHOT: hero sekce — title + subtitle] -->

---

## Společná pole sekcí

Každá položka v `sections[]` je objekt. Pole společná pro **všechny** typy sekcí:

| Pole | Povinné | Popis |
|---|---|---|
| `type` | ano | Typ sekce. Určuje, jak se sekce vykreslí. Seznam povolených hodnot viz níže. |
| `title` | viz typ | Nadpis sekce. Lokalizovaný text. U některých typů se ignoruje. |
| `visible` | ne | Když je `false`, sekce se úplně přeskočí. Výchozí `true`. Hodí se pro dočasné schování bez mazání konfigurace. |

Další pole (`items`, `categories`, `tags`, `sectionUrl`, `buttonText`, `cardVariant`, `pids`, `hideIfEmpty`, `showCount`) jsou specifické pro jednotlivé typy a popisují se u každého typu samostatně.

---

## Přehled typů sekcí

Typy se dělí na dvě skupiny:

- **Hotové sekce** — každá má vlastní pevně daný vzhled a data si táhne sama z backendu. Config umí jen **zapnout/vypnout** a **určit pořadí**. Pole jako `title` nebo `buttonText` pro tyto typy nic nedělají.
- **Konfigurovatelné sekce** — obsah určuje přímo tento soubor (ruční kurátorování). Nadpisy, tlačítka, položky — všechno jde nastavit.

| `type` | Skupina | Co to je |
|---|---|---|
| `periodicals` | hotová | Karusel periodik z API |
| `books` | hotová | Karusel knih z API |
| `genres` | hotová | Mřížka žánrů z API |
| `document-types` | hotová | Přehled typů dokumentů z API |
| `featured-documents` | konfigurovatelná | Kurátorovaný seznam dokumentů nebo položek |
| `link-tiles` | konfigurovatelná | Mřížka odkazů s ikonami |
| `suggested-tags` | speciální | Navrhované tagy v hero oblasti |

---

## Typ `suggested-tags` — navrhované tagy

Chipy s přednastavenými vyhledávacími dotazy. Zobrazují se v hero oblasti pod vyhledávacím polem.

```json
{
  "type": "suggested-tags",
  "tags": [
    {
      "text": {
        "cs": "Knihy Karla Čapka",
        "en": "Books by Karel Čapek"
      },
      "filter": "?query=&page=1&pageSize=60&sortBy=score&sortDirection=desc&fq=authors.facet:Čapek,%20Karel"
    }
  ]
}
```

| Pole | Povinné | Popis |
|---|---|---|
| `tags` | ano | Pole tagů. Když je prázdné nebo chybí, sekce se nezobrazí. |
| `tags[].text` | ano | Text tagu. Lokalizovaný. Zobrazí se jako klikací chip. |
| `tags[].filter` | ano | Hotový query string pro stránku vyhledávání. Po kliknutí se uživatel přesune na `/search{filter}`. Musí začínat otazníkem. |

### Jak získat `filter` string
Nejjednodušší způsob: otevřít stránku vyhledávání, nastavit požadované filtry v UI (rok od/do, licence, autor, typ dokumentu…), zkopírovat celou query část URL z adresního řádku (vše od `?` po konec) a vložit ji jako `filter`.

<!-- [SCREENSHOT: suggested-tags chipy pod search inputem] -->

---

## Typ `featured-documents` — kurátorovaný výběr

Karusel s ručně vybranými položkami. Nejčastější použití jsou výběry dokumentů z API ("Výběr z nejčtenějších knih", "Nejpopulárnější periodika"), ale sekce je univerzální — dá se použít i pro **úplně vlastní obsah** bez vazby na backend (autoři s portréty, žánry s obrázky, odkazy na sbírky…).

### Varianta A: dokumenty z API (pomocí Kramerius UUID)

Když je v položce `id` ve formátu `uuid:...`, aplikace si dotáhne metadata dokumentu z backendu (náhled, typ, licence).

```json
{
  "type": "featured-documents",
  "title": {
    "cs": "Výběr z nejčtenějších novin a časopisů",
    "en": "Selection of most-read newspapers and magazines"
  },
  "buttonText": {
    "cs": "Více periodik",
    "en": "More periodicals"
  },
  "sectionUrl": "/search?query=&page=1&pageSize=60&sortBy=date.max&sortDirection=desc&customSearch=custom-root-model:periodical",
  "cardVariant": "default",
  "items": [
    {
      "id": "uuid:ae876087-435d-11dd-b505-00145e5790ea",
      "title": {
        "cs": "Národní listy",
        "en": "Národní listy"
      }
    }
  ]
}
```

### Varianta B: vlastní obsah (obrázek + text + odkaz)

Když `id` **není** Kramerius UUID (např. libovolný řetězec `"25"`, `"genre-1"`, nebo chybí úplně), aplikace se backendu ani nedotýká a vykreslí položku jen z toho, co je v configu. Můžeš tam dát cokoli — vlastní obrázek, vlastní text, odkaz kamkoli.

```json
{
  "type": "featured-documents",
  "title": {
    "cs": "Autoři",
    "en": "Authors"
  },
  "cardVariant": "portrait",
  "items": [
    {
      "id": "25",
      "title": {
        "cs": "Sestry Brontëovy",
        "en": "The Brontë sisters"
      },
      "date": "1816–1855, 1818–1848, 1820–1849",
      "imageUrl": "local-config/mzk/img/authors/bronte.png",
      "externalUrl": "/search?query=&fq=authors.facet:Brontë,%20Charlotte"
    }
  ]
}
```

### Pole sekce

| Pole | Povinné | Popis |
|---|---|---|
| `title` | ne | Nadpis sekce nad karuselem. Když chybí, nadpis bude prázdný. |
| `items` | ano* | Pole položek. Viz níže. |
| `pids` | ano* | Alternativa k `items` — zjednodušený zápis, když stačí jen UUID bez dalších polí: `["uuid:...", "uuid:..."]`. Když jsou zadané obě pole, použije se `items`. |
| `sectionUrl` | ne | URL, kam vede tlačítko "více". Obvykle deep-link do vyhledávání s předvyplněným filtrem. Když chybí, tlačítko "více" se vůbec nezobrazí. |
| `buttonText` | ne | Popisek tlačítka "více". Když chybí, použije se obecný překlad "Zobrazit více". |
| `cardVariant` | ne | Vzhled karet. Povolené hodnoty: <br>• `"default"` (výchozí) — menší obrázek, vedle něho nebo pod ním další informace o dokumentu (autor, datum, typ…).<br>• `"portrait"` — větší obrázek na šířku celé karty, pod ním jen název. Hodí se pro vizuálně silné sekce (autoři s portréty, žánry s ilustracemi). |

*Buď `items`, nebo `pids`. Když nejsou zadané žádné položky (nebo jsou prázdné), sekce se nezobrazí vůbec — ani nadpis.

### Pole jedné položky v `items[]`

Minimální položka má jen `id` nebo jen `title`. Všechna ostatní pole jsou volitelná a kombinují se s daty z API (pokud `id` je Kramerius UUID) — pole uvedená v configu **přebijí** data z backendu.

| Pole | Popis |
|---|---|
| `id` | Identifikátor položky. Když je ve formátu `uuid:...`, aplikace si dotáhne metadata z backendu. Jinak (libovolný řetězec, nebo zcela chybí) se položka vykreslí jen z configu. |
| `title` | Lokalizovaný název. Když je vyplněný, přebije název z backendu — užitečné pro zkrácení dlouhých katalogových názvů nebo ruční úpravu. |
| `imageUrl` | Cesta k vlastnímu obrázku (typicky pod `local-config/{kód}/img/...`). Přebije náhled z backendu. U varianty B (vlastní obsah) je to obvykle jediný obrázek. |
| `externalUrl` | Kam vede klik na kartu. Může to být deep-link do vyhledávání, externí URL, nebo cokoli jiného. Když chybí a `id` je UUID, klik vede na detail dokumentu. |
| `date` | Volný text s datem nebo rozsahem let (zobrazuje se u karet, hodí se pro životopisné údaje u autorů). |

Pro obsah s UUID můžeš přidat i další pole — aplikace je sloučí s metadaty z API.

### Co se stane, když dokument s daným UUID v backendu už neexistuje
Tiše zmizí z karuselu. Není nutné ručně čistit konfiguraci při každém smazání, ale je dobré ji občas projít.

<!-- [SCREENSHOT: featured-documents karusel — dokumenty z API] -->
<!-- [SCREENSHOT: featured-documents portrait variant — autoři / žánry s vlastními obrázky] -->

---

## Typ `link-tiles` — mřížka odkazů s ikonami

Grid dlaždic, kde každá je klikací odkaz s ikonou a popiskem. Používá se jako navigační rozcestník (např. "Prohlížet podle typu dokumentu" s dlaždicemi Periodika / Knihy / Mapy…).

```json
{
  "type": "link-tiles",
  "title": {
    "cs": "Typy dokumentů",
    "en": "Document types"
  },
  "categories": [
    {
      "type": "periodical",
      "label": {
        "cs": "Periodika",
        "en": "Periodicals"
      },
      "url": "/search?customSearch=custom-root-model:periodical"
    },
    {
      "type": "monograph",
      "label": {
        "cs": "Knihy",
        "en": "Books"
      },
      "url": "/search?customSearch=custom-root-model:monograph"
    }
  ]
}
```

### Pole sekce

| Pole | Povinné | Popis |
|---|---|---|
| `title` | ne | Nadpis sekce nad mřížkou. |
| `categories` | ano | Pole dlaždic. Když je prázdné, sekce se vykreslí jen s nadpisem (bez obsahu). |

### Pole jedné dlaždice v `categories[]`

| Pole | Povinné | Popis |
|---|---|---|
| `label` | ano | Popisek dlaždice. Lokalizovaný text. |
| `url` | ano | Kam dlaždice vede po kliknutí. Obvykle deep-link do `/search` s předvyplněným filtrem. |
| `type` | ne | Typ dokumentu — **určuje ikonu dlaždice**. Doporučené hodnoty odpovídají Kramerius modelům: `periodical`, `monograph`, `map`, `graphic`, `archive`, `manuscript`, `soundrecording`, `sheetmusic`, `convolute`, `collection`. Jiná hodnota nebo vynechání → žádná / výchozí ikona. |
| `icon` | ne | Explicitní cesta nebo URL k ikoně. Přebije automatickou ikonu odvozenou z `type`. |

<!-- [SCREENSHOT: link-tiles grid — typy dokumentů] -->

---

## Hotové sekce

Tyto typy mají vlastní, pevně daný vzhled a data si táhnou samy z API. V configu stačí napsat položku s `type` — ostatní pole jsou ignorována.

```json
{ "type": "periodicals" },
{ "type": "books" },
{ "type": "genres" },
{ "type": "document-types" }
```

| `type` | Obsah |
|---|---|
| `periodicals` | Výběr periodik z API (novin a časopisů). |
| `books` | Výběr monografií z API. |
| `genres` | Mřížka žánrů dostupných v knihovně. |
| `document-types` | Přehled typů dokumentů s počty. |

Když se u těchto sekcí napíše `title`, `buttonText` nebo jiné pole, nic se neprojeví — sekce si vše řídí interně.

<!-- [SCREENSHOT: hotové sekce periodicals + books -->

---

## Minimální příklad

```json
{
  "title": {
    "cs": "Moje knihovna",
    "en": "My Library"
  },
  "subtitle": {
    "cs": "Krátký popis knihovny",
    "en": "Short library description"
  },
  "sections": [
    {
      "type": "suggested-tags",
      "tags": [
        {
          "text": { "cs": "Historické mapy", "en": "Historical maps" },
          "filter": "?query=&customSearch=custom-root-model:map&fq=licenses.facet:public"
        }
      ]
    },
    { "type": "periodicals" },
    { "type": "books" },
    {
      "type": "link-tiles",
      "title": {
        "cs": "Prohlížet podle typu",
        "en": "Browse by type"
      },
      "categories": [
        {
          "type": "monograph",
          "label": { "cs": "Knihy", "en": "Books" },
          "url": "/search?customSearch=custom-root-model:monograph"
        },
        {
          "type": "map",
          "label": { "cs": "Mapy", "en": "Maps" },
          "url": "/search?customSearch=custom-root-model:map"
        }
      ]
    }
  ]
}
```

---

## Související

- [`config-main.md`](config-main.md) — hlavní konfigurace
- [`config-licenses.md`](config-licenses.md) — licence dokumentů
