/**
 * Desktop UI density is applied as CSS `zoom` on <html> (see `--ui-zoom` in
 * styles.scss). Under zoom, getBoundingClientRect(), clientX/Y and
 * window.innerWidth/innerHeight are in *visual* (on-screen) pixels, while
 * offsetWidth/offsetHeight and lengths written to element styles are in CSS
 * pixels, which the browser multiplies by the zoom. Code that measures with
 * one and writes with the other must convert through this factor.
 */
export function uiZoom(): number {
  if (typeof document === 'undefined') return 1;
  const zoom = parseFloat(getComputedStyle(document.documentElement).zoom);
  return zoom > 0 ? zoom : 1;
}

/** Converts a visual (on-screen) length or coordinate to CSS pixels. */
export function toCssPx(visualPx: number): number {
  return visualPx / uiZoom();
}

/**
 * The compensations above assume standardized CSS zoom (Chromium 128+,
 * Firefox 126+): rects scale with the zoom, offset sizes do not, and viewport
 * units are zoomed. Engines that differ (legacy WebKit zoom, no zoom support)
 * would end up with mis-sized layouts, so there the UI zoom is switched off
 * (`ui-zoom-off` pins `--ui-zoom` to 1) and the app renders at 100%.
 */
export function verifyUiZoom(): void {
  if (typeof document === 'undefined' || !document.body) return;
  const zoom = uiZoom();
  if (zoom === 1) return;
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:0;top:0;width:100px;height:100vh;visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);
  const rect = probe.getBoundingClientRect();
  const standard = Math.abs(rect.width - 100 * zoom) < 1
    && probe.offsetWidth === 100
    && Math.abs(rect.height - window.innerHeight * zoom) < 2;
  probe.remove();
  if (!standard) {
    document.documentElement.classList.add('ui-zoom-off');
  }
}
