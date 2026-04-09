# Home Sections Configuration (`config-homepage.json`)

This file configures the sections displayed on the search/home page. It is a JSON object with a `code` field and a `sections` array where each object represents a section.

## Top-level Structure

```
{
  "code": "cdk",
  "sections": [ ... ]
}
```

| Property | Type | Description |
| :--- | :--- | :--- |
| `code` | String | **Required**. The library code this config belongs to (e.g., `"cdk"`). |
| `sections` | Array | **Required**. Ordered list of section objects to display on the home page. |

## Section Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `type` | String | **Required**. The type of section. See **Section Types** below. |
| `title` | String | **Required**. The title of the section. Can be a translation key (e.g., `"periodical"`) or a raw string. |
| `visible` | Boolean | Optional. Set to `false` to hide the section. Default is `true`. |
| `items` | Array | Optional. Used for `"featured-documents"` sections to define the content. See **Featured Document Items** below. |
| `categories` | Array | Optional. Used for `"link-tiles"` sections. See **Category Items** below. |
| `tags` | Array | Optional. Used for `"suggested-tags"` sections. See **Suggested Tags** below. |
| `hideIfEmpty` | Boolean | Optional. If `true`, the section is hidden if it has no items. |
| `comment` | String | Optional. A field for your notes (ignored by the application). |
| `sectionUrl` | String | Optional. URL for the "more" button shown at the section header. |
| `buttonText` | String | Optional. Label for the "more" button. |
| `cardVariant` | String | Optional. Card display variant: `"default"` or `"author"`. |
| `showCount` | Boolean | Optional. Whether to show item counts in category tiles. |

## Section Types

| Type | Description |
| :--- | :--- |
| `"periodicals"` | Built-in periodicals section (fetched from API). |
| `"books"` | Built-in books section (fetched from API). |
| `"authors"` | Built-in authors section (fetched from API). |
| `"genres"` | Built-in genres section (fetched from API). |
| `"images"` | Built-in images section (fetched from API). |
| `"document-types"` | Built-in document types section (fetched from API). |
| `"map"` | Built-in map section. |
| `"institutions"` | Built-in institutions section. |
| `"featured-documents"` | Custom section with manually defined cards. Uses `items` array. |
| `"link-tiles"` | Custom section with category tiles linking to search URLs. Uses `categories` array. |
| `"suggested-tags"` | Clickable search suggestion tags shown inside the search hero. Uses `tags` array. If this section is absent or has no tags, the tag row is hidden. |

## Featured Document Items

The `items` array in a `"featured-documents"` section accepts the following properties:

- `id`: (String, Optional) The UUID of the document in the repository (e.g., `"uuid:..."`). If present, data is fetched from the API.
- `title`: (String) The title to display. **Overrides** API data if `id` is present.
- `imageUrl`: (String) URL for the thumbnail image. **Overrides** API data.
- `externalUrl`: (String) A URL to open when clicked. If set, this overrides the default behavior of opening the document in the application.
- `model`: (String) The model of the document (e.g., `"monograph"`, `"page"`). Useful for manual items.
- `ownParentPid`: (String) The UUID of the parent document (required for pages/articles to link correctly).
- `date`: (String) Date or date range displayed on author cards (e.g., `"1890–1938"`). Used with `cardVariant: "author"`.

## Category Items

The `categories` array in a `"link-tiles"` section accepts:

- `label`: (String) Translation key or display label for the category tile.
- `url`: (String) Search URL the tile links to.

## Suggested Tags

The `tags` array in a `"suggested-tags"` section accepts:

- `text`: (String) The label shown on the tag chip.
- `filter`: (String) Search URL query string (starting with `?`) to navigate to when the tag is clicked.

## Scenarios

### 1. Standard Section
Display a built-in section like Periodicals.
```json
{
  "type": "periodicals",
  "title": "periodical"
}
```

### 2. Hiding a Section
Hide the Genres section.
```json
{
  "type": "genres",
  "title": "genres",
  "visible": false
}
```

### 3. Suggested Search Tags
Tags displayed in the search hero. Omit this section entirely (or set `"visible": false`) to hide the tag row.
```json
{
  "type": "suggested-tags",
  "title": "suggested-tags",
  "tags": [
    { "text": "Knihy Karla Čapka", "filter": "?query=&page=1&pageSize=60&fq=authors.facet:Čapek,%20Karel" },
    { "text": "Mapy 16. století", "filter": "?page=1&pageSize=60&customSearch=custom-root-model:map" }
  ]
}
```

### 4. Featured Documents Section (API items)
Load cards from the repository using UUIDs.
```json
{
  "type": "featured-documents",
  "title": "Výběr z nejčtenějších knih",
  "buttonText": "Více knih",
  "sectionUrl": "/search?query=&customSearch=custom-root-model:monograph",
  "items": [
    { "id": "uuid:7e11fe20-043e-11e5-95ff-5ef3fc9bb22f", "title": "Ottův slovník naučný" }
  ]
}
```

### 5. Featured Documents Section (Author cards)
Display author cards with a portrait image and date range.
```json
{
  "type": "featured-documents",
  "title": "Výběr z českých autorů",
  "cardVariant": "author",
  "items": [
    {
      "id": "1",
      "title": "Karel Čapek",
      "date": "1890–1938",
      "imageUrl": "local-config/img/authors/capek_karel.png",
      "externalUrl": "/search?query=&fq=authors.facet:%C4%8Capek,%20Karel"
    }
  ]
}
```

### 6. Link Tiles Section
Display document type tiles linking to search results.
```json
{
  "type": "link-tiles",
  "title": "Typy dokumentů",
  "showCount": false,
  "categories": [
    { "label": "periodical", "url": "/search?page=1&customSearch=custom-root-model:periodical" },
    { "label": "monograph", "url": "/search?page=1&customSearch=custom-root-model:monograph" }
  ]
}
```

### 7. Fully Manual Item (no API fetch)
A custom card with a static image and external link.
```json
{
  "type": "featured-documents",
  "title": "Useful Links",
  "items": [
    {
      "title": "Google",
      "imageUrl": "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png",
      "externalUrl": "https://www.google.com"
    }
  ]
}
```
