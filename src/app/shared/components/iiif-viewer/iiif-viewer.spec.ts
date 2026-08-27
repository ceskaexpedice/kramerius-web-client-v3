import { IIIFViewer } from './iiif-viewer';

/**
 * Regression tests for issue #161: swipe page-turning stopped working once the
 * AI panel split the viewer, and in portrait generally.
 *
 * The gate is isAtBaseZoom(), which used to compare the current zoom against
 * getHomeZoom() alone. updateMinZoomLevel() raises minZoomLevel to fit-height,
 * which in a tall/narrow container sits well above home zoom — so the viewer
 * rested above its own tolerance and every swipe was rejected.
 */
describe('IIIFViewer.isAtBaseZoom', () => {

  /**
   * Drives the real isAtBaseZoom() against a stub viewport, so the arithmetic
   * under test is the component's own.
   */
  function atBaseZoom(opts: { currentZoom: number; homeZoom: number; minZoomLevel: number }): boolean {
    const component = Object.create(IIIFViewer.prototype) as IIIFViewer;
    (component as any).SWIPE_CONFIG = { zoomTolerance: 1.15 };
    (component as any).viewer = {
      minZoomLevel: opts.minZoomLevel,
      viewport: {
        getZoom: () => opts.currentZoom,
        getHomeZoom: () => opts.homeZoom,
      },
    };
    return (component as any).isAtBaseZoom();
  }

  it('treats a portrait viewer resting at fit-height as un-zoomed', () => {
    // Phone portrait, 2000x3000 image: home=1.0 but minZoomLevel=1.197,
    // so the viewport rests at 1.197 without the user zooming at all.
    expect(atBaseZoom({ currentZoom: 1.197, homeZoom: 1.0, minZoomLevel: 1.197 })).toBe(true);
  });

  it('treats the half-width AI split view as un-zoomed', () => {
    // Same image at half width: minZoomLevel more than doubles.
    expect(atBaseZoom({ currentZoom: 2.393, homeZoom: 1.0, minZoomLevel: 2.393 })).toBe(true);
  });

  it('still reports a genuinely zoomed-in viewer as zoomed', () => {
    // User pinch-zoomed well past the resting level.
    expect(atBaseZoom({ currentZoom: 5.0, homeZoom: 1.0, minZoomLevel: 2.393 })).toBe(false);
  });

  it('allows a small amount of zoom within the tolerance', () => {
    expect(atBaseZoom({ currentZoom: 2.5, homeZoom: 1.0, minZoomLevel: 2.393 })).toBe(true);
    expect(atBaseZoom({ currentZoom: 2.76, homeZoom: 1.0, minZoomLevel: 2.393 })).toBe(false);
  });

  it('keeps working where home zoom is already the resting zoom', () => {
    // Landscape / desktop: minZoomLevel equals home zoom, the case that always worked.
    expect(atBaseZoom({ currentZoom: 0.371, homeZoom: 0.371, minZoomLevel: 0.371 })).toBe(true);
    expect(atBaseZoom({ currentZoom: 1.5, homeZoom: 0.371, minZoomLevel: 0.371 })).toBe(false);
  });

  it('tolerates a viewer with no minZoomLevel set', () => {
    expect(atBaseZoom({ currentZoom: 1.0, homeZoom: 1.0, minZoomLevel: 0 })).toBe(true);
  });

});
