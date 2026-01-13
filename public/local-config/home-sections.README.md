# Home Sections Configuration (`home-sections.json`)

This file configures the sections displayed on the search/home page. It is a JSON array where each object represents a section.

## Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `type` | String | **Required**. The type of section. <br>Standard types: `"periodicals"`, `"books"`, `"authors"`, `"genres"`, `"images"`, `"document-types"`, `"map"`, `"institutions"`.<br>Custom type: `"custom"`. |
| `title` | String | **Required**. The title of the section. Can be a translation key (e.g., `"periodical"`) or a raw string. |
| `visible`| Boolean| Optional. Set to `false` to hide the section. Default is `true`. |
| `items` | Array | Optional. Used for `"custom"` sections to define the content. See **Custom Items** below. |
| `hideIfEmpty` | Boolean | Optional. If `true`, the section is hidden if it has no items. |
| `comment` | String | Optional. A field for your notes (ignored by the application). |

## Custom Items

The `items` array in a `"custom"` section can contain objects with the following properties:

- `id`: (String, Optional) The UUID of the document in the repository (e.g., `"uuid:..."`). If present, data is fetched from the API.
- `title`: (String) The title to display. **Overrides** API data if `id` is present.
- `imageUrl`: (String) URL for the thumbnail image. **Overrides** API data.
- `externalUrl`: (String) A URL to open when clicked. If set, this overrides the default behavior of opening the document in the application.
- `model`: (String) The model of the document (e.g., `"monograph"`, `"page"`). Useful for manual items.
- `ownParentPid`: (String) The UUID of the parent document (required for pages/articles to link correctly).

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

### 3. Fully Manual Item
A custom card that links to Google.
```json
{
  "type": "custom",
  "title": "Useful Links",
  "items": [
    {
      "title": "Google",
      "imageUrl": "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png",
      "externalUrl": "https://www.google.com",
      "comment": "External link example"
    }
  ]
}
```

### 4. API Item (Auto-loaded)
Load an item from the repository using its UUID. Title and image are fetched automatically.
```json
{
  "type": "custom",
  "title": "Featured Item",
  "items": [
    {
      "id": "uuid:226d8161-4ec5-43ab-ac51-db929bd72b8a"
    }
  ]
}
```

### 5. Hybrid Item (API + Override)
Load an item from API but provide a custom title.
```json
{
  "type": "custom",
  "title": "My Selection",
  "items": [
    {
      "id": "uuid:226d8161-4ec5-43ab-ac51-db929bd72b8a",
      "title": "My Custom Title"
    }
  ]
}
```
