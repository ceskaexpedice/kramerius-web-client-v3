# @allmaps/viewer-lite

`@allmaps/viewer-lite` is a plain JavaScript map viewer for georeferenced maps.

## What It Does

The viewer provides a map canvas with a configurable basemap and renders one or more georeferenced maps on top of it.

Current capabilities:

- pan and zoom
- configurable XYZ basemap
- built-in basemap presets
- render one or more georeferenced maps
- fit to all maps or a single map
- control global map opacity
- control global background removal
- show outlines for any subset of loaded maps
- switch outline geometry between mask and bbox
- switch outline fill between filled and hollow
- read the current viewport bounds and viewport state
- emit hover and click events for loaded maps
- emit viewport change events

## Integration Model

The intended integration model is:

1. host app fetches data
2. host app converts data to `GeoreferencedMap[]`
3. host app creates the viewer
4. host app controls the viewer through its API


## Input Data

The viewer itself expects `GeoreferencedMap[]`.

That is the internal render-ready shape used by Allmaps rendering packages.

In practice, a host app can derive this from:

- a single Web Annotation
- an AnnotationPage
- an internal backend payload that contains georeferenced maps

The demo app includes a helper that accepts those broader input shapes and extracts `GeoreferencedMap[]`. The viewer package itself stays strict and only works with the final map array.

## Installation

```bash
pnpm add @allmaps/viewer-lite
```

## Basic Usage

```js
import { createAllmapsViewer } from '@allmaps/viewer-lite'

const viewer = createAllmapsViewer(container, {
  maps,
  basemap: {
    type: 'xyz',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors'
  },
  outlineStyle: {
    strokeColor: '#ff56ba',
    strokeWidth: 5,
    fillColor: 'rgba(255, 86, 186, 0.12)'
  },
  preview: {
    mode: 'mask'
  },
  fitOnInit: true
})
```

## API

### Factory

#### `createAllmapsViewer(container, options)`

Creates a viewer instance bound to a DOM container.

## Map Data Methods

#### `viewer.setMaps(maps)`

Replaces all currently rendered maps.

#### `viewer.addMaps(maps)`

Adds more maps to the current viewer.

#### `viewer.clearMaps()`

Removes all maps and clears outline state.

#### `viewer.removeMap(mapId)`

Removes a single loaded map.

#### `viewer.getMapIds()`

Returns the currently loaded map IDs.

#### `viewer.getMaps()`

Returns loaded map records.

## Map Visibility and Navigation

#### `viewer.setMapVisibility(mapId, visible)`

Shows or hides a single map.

## Map Order Controls

#### `viewer.bringMapsToFront(mapIds)`

Moves one or more maps to the top of the stack.

#### `viewer.bringMapsForward(mapIds)`

Moves one or more maps one step forward.

#### `viewer.sendMapsBackward(mapIds)`

Moves one or more maps one step backward.

#### `viewer.sendMapsToBack(mapIds)`

Moves one or more maps to the bottom of the stack.

## Navigation and Viewport

#### `viewer.fitToMaps()`

Fits the viewport to all loaded maps.

#### `viewer.fitToMap(mapId)`

Fits the viewport to a single loaded map.

#### `viewer.resize()`

Should be called after layout changes if the map container size changes.

#### `viewer.getViewportBounds(projection?)`

Returns the currently visible map bounds.

Default projection: `EPSG:4326`

#### `viewer.getViewportState(projection?)`

Returns the currently visible bounds together with center and zoom.

Default projection: `EPSG:4326`

## Basemap Controls

#### `viewer.getBasemapPresets()`

Returns built-in raster basemap presets available in `viewer-lite`.

Current presets:

- `osm`
- `esri-world-topo`
- `esri-world-street`
- `esri-world-imagery`

#### `viewer.getBasemap()`

Returns the currently configured basemap definition, or `false` when disabled.

#### `viewer.setBasemap(basemap)`

Sets or replaces the basemap at runtime.

Accepted values:

- a preset id such as `'osm'`
- a custom XYZ definition
- `false` to remove the basemap

Example:

```js
viewer.setBasemap('esri-world-imagery')

viewer.setBasemap({
  type: 'xyz',
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '© OpenStreetMap contributors'
})
```

#### `viewer.setBasemapVisible(visible)`

Shows or hides the currently configured basemap.

## Render Controls

#### `viewer.setOpacity(value)`

Sets global map opacity. Range: `0..1`.

#### `viewer.setEnhanceLines(value)`

Sets the global line-enhancement amount. Range: `0..1`.

## Outline Controls

#### `viewer.setOutlinedMapIds(mapIds)`

Controls exactly which loaded maps should show outlines.

#### `viewer.getOutlinedMapIds()`

Returns the currently outlined map IDs.

#### `viewer.setOutlinesVisible(visible)`

Convenience helper:

- `true` = outline all loaded maps
- `false` = outline none

#### `viewer.getOutlinesVisible()`

Returns `true` only when all currently loaded maps are outlined.

#### `viewer.setOutlineFillMode(mode)`

Sets outline fill mode:

- `'fill'`
- `'none'`

#### `viewer.getOutlineFillMode()`

Returns the current fill mode.

#### `viewer.setPreviewMode(mode)`

Sets outline geometry mode:

- `'mask'`
- `'bbox'`

#### `viewer.getPreviewMode()`

Returns the current outline geometry mode.

#### `viewer.showPreviewByMapId(mapId)`

Ensures a loaded map is included in the outlined/previewed set.

#### `viewer.hidePreviewByMapId(mapId)`

Removes a loaded map from the outlined/previewed set.

#### `viewer.togglePreviewByMapId(mapId)`

Toggles outline/preview visibility for a single loaded map and returns the new state.

#### `viewer.syncPreviewsForMapIds(mapIds)`

Alias for syncing the outlined map set from host UI state.

#### `viewer.showPreviewGeometry(preview)`

Draws an arbitrary preview geometry on the preview layer.

#### `viewer.hidePreview()`

Clears the preview layer.

#### `viewer.setOutlineStyle(style)`

Sets the global outline style.

```js
viewer.setOutlineStyle({
  strokeColor: '#ff0088',
  strokeWidth: 5,
  fillColor: 'rgba(255, 0, 136, 0.12)'
})
```

#### `viewer.getOutlineStyle()`

Returns the current global outline style.

## Events

#### `viewer.on(eventName, handler)`

Subscribes to viewer events.

Current events:

- `ready`
- `mapclick`
- `maphover`
- `viewportchange`

Example:

```js
viewer.on('maphover', (event) => {
  console.log(event.detail.mapId)
})

viewer.on('viewportchange', (event) => {
  console.log(event.detail.bounds)
})
```

## Example: Host-Controlled UI

A host application can wire its own UI controls to the viewer:

```js
opacitySlider.addEventListener('input', (event) => {
  viewer.setOpacity(Number(event.target.value))
})

fillToggle.addEventListener('click', () => {
  viewer.setOutlineFillMode(
    viewer.getOutlineFillMode() === 'fill' ? 'none' : 'fill'
  )
})

outlineToggle.addEventListener('click', () => {
  viewer.setOutlinedMapIds([mapIdA, mapIdB])
})

viewer.on('viewportchange', (event) => {
  searchMapsInBounds(event.detail.bounds)
})
```

## Demo App

This repo also contains a local demo app:

- `app/allmaps/apps/viewer-lite-demo`

It is not part of the reusable package API. It exists to:

- test integration flows
- load URL or pasted JSON payloads
- demonstrate host-controlled UI around the viewer

Run it from the monorepo root:

```bash
cd app/allmaps
HUSKY=0 pnpm --filter @allmaps/viewer-lite-demo dev --host 127.0.0.1 --port 5517
```

## Current Limitations

- outline styling is currently global, not per-map
- the viewer expects already parsed `GeoreferencedMap[]`
- advanced editor/viewer features are intentionally out of scope for this package
