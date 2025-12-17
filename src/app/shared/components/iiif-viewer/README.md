# IIIF Viewer Component

## Overview

The IIIF Viewer is a simple and efficient image viewer component built on OpenSeadragon with IIIF (International Image Interoperability Framework) support. It provides essential features for viewing high-resolution images.

## Features

- **IIIF Protocol Support**: Seamlessly loads multi-tile images from IIIF-compliant servers
- **Zoom**: Smooth zooming with mouse wheel or pinch gestures
- **Rotation**: Rotate images in 90-degree increments (0°, 90°, 180°, 270°)
- **Fullscreen Mode**: View images in fullscreen
- **Fit to Width**: Fit image to viewport width
- **Fit to Screen**: Fit entire image to viewport

## Installation

The component uses OpenSeadragon, which is already installed:

```bash
npm install openseadragon
npm install --save-dev @types/openseadragon
```

## Usage

### Basic Usage

```typescript
<app-iiif-viewer
  [metadata]="metadata"
  [imagePid]="imagePid">
</app-iiif-viewer>
```

### Component Inputs

- `metadata: Metadata | null` - Metadata object containing UUID of the item
- `imagePid: string | null` - PID (Persistent Identifier) of the image to display

### Service Methods

The `IIIFViewerService` provides the following methods:

#### Zoom Controls
```typescript
iiifViewerService.zoomIn();      // Zoom in by 20%
iiifViewerService.zoomOut();     // Zoom out by 20%
iiifViewerService.fitToScreen(); // Fit image to screen
iiifViewerService.fitToWidth();  // Fit image to width
iiifViewerService.resetView();   // Reset zoom and rotation
```

#### Rotation Controls
```typescript
iiifViewerService.toggleRotation();        // Rotate by 90°
iiifViewerService.setRotation(90);         // Set specific rotation (0|90|180|270)
```

#### Fullscreen
```typescript
iiifViewerService.toggleFullscreen();      // Toggle fullscreen mode
```

## Example: Complete Usage

```typescript
import { Component, inject } from '@angular/core';
import { IIIFViewerService } from './services/iiif-viewer.service';

@Component({
  selector: 'app-my-component',
  template: `
    <app-iiif-viewer [imagePid]="imagePid"></app-iiif-viewer>

    <div class="controls">
      <button (click)="zoomIn()">Zoom In</button>
      <button (click)="zoomOut()">Zoom Out</button>
      <button (click)="rotate()">Rotate</button>
      <button (click)="fitToScreen()">Fit to Screen</button>
      <button (click)="fitToWidth()">Fit to Width</button>
      <button (click)="toggleFullscreen()">Fullscreen</button>
    </div>
  `
})
export class MyComponent {
  iiifViewerService = inject(IIIFViewerService);
  imagePid = 'uuid:42f6a145-b0d4-11f0-8ef7-9eeccf07f797';

  zoomIn() {
    this.iiifViewerService.zoomIn();
  }

  zoomOut() {
    this.iiifViewerService.zoomOut();
  }

  rotate() {
    this.iiifViewerService.toggleRotation();
  }

  fitToScreen() {
    this.iiifViewerService.fitToScreen();
  }

  fitToWidth() {
    this.iiifViewerService.fitToWidth();
  }

  toggleFullscreen() {
    this.iiifViewerService.toggleFullscreen();
  }
}
```

## IIIF API Integration

The component expects IIIF info.json URLs in the format:
```
https://api.kramerius.mzk.cz/search/iiif/{pid}/info.json
```

For example:
```
https://api.kramerius.mzk.cz/search/iiif/uuid:42f6a145-b0d4-11f0-8ef7-9eeccf07f797/info.json
```

The info.json should follow IIIF Image API 2.0 or 3.0 specification.

## Performance Tips

1. **Image Tiles**: Ensure your IIIF server properly generates image tiles for optimal performance
2. **Viewport Limits**: Set appropriate `minZoomLevel` and `maxZoomLevel` in the OpenSeadragon config
3. **CORS Headers**: Ensure the IIIF server sends proper CORS headers for WebGL acceleration

## Troubleshooting

### Image doesn't load
- Check that the IIIF info.json URL is correct and accessible
- Verify CORS headers on your IIIF server
- Check browser console for errors

### WebGL warning
- If you see "WebGL cannot be used to draw this TiledImage because it has tainted data":
  - This means the IIIF server needs to send CORS headers: `Access-Control-Allow-Origin: *`
  - The viewer will automatically fall back to Canvas rendering (still works, just slower)

### Images appear blurry at high zoom
- Check that your IIIF server is configured with appropriate tile sizes (256x256 recommended)
- Verify the `tiles` configuration in the info.json response
