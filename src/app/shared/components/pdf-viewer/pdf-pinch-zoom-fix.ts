/**
 * Keeps pdf.js pinch-zoom anchored under the fingers (ngx-extended-pdf-viewer,
 * pdf.js 6.0). Two problems made the page jump while pinching on a phone:
 *
 * 1. `#viewerContainer` has `scroll-behavior: smooth` (smooth page navigation).
 *    Each pinch step pdf.js writes the scroll position several times in a row
 *    (scroll the frozen location into view, then shift by the pinch origin) and
 *    reads it back in between. With smooth scrolling every write starts an
 *    animation instead of moving, the reads return stale values and the view
 *    lands somewhere else — even flipping between pages. The class below turns
 *    smooth scrolling off for the duration of a two-finger gesture.
 *
 * 2. pdf.js's TouchManager reports the pinch origin in *screen* coordinates
 *    (`touch.screenX/Y`) but the zoom compares it with the container's
 *    `getBoundingClientRect()` (viewport coordinates). On iOS the two differ
 *    by at least the status bar, so the zoom anchored below/beside the fingers
 *    and drifted further with every step. The origin is converted to viewport
 *    coordinates before it reaches `updateZoom`.
 */

/**
 * Set on `#viewerContainer` while pdf.js rescales (two fingers down, or a zoom
 * button): turns its smooth scrolling off; see pdf-viewer.scss.
 */
export const PDF_INSTANT_SCROLL_CLASS = 'cdk-pdf-instant-scroll';

/** The bits of PDFViewerApplication used here (untyped in the library). */
export interface PdfJsZoomApp {
  updateZoom: (steps: number | null, scaleFactor?: number | null, origin?: [number, number] | null) => void;
  pdfViewer?: {
    /** The element pdf.js scrolls (#viewerContainer). */
    container: HTMLElement;
    currentScale: number;
    currentScaleValue: string | number;
    pagesCount: number;
    updateScale: (options: { scaleFactor: number; origin?: [number, number]; drawingDelay?: number }) => void;
  };
}

/**
 * Runs a synchronous pdf.js rescale with smooth scrolling off: pdf.js writes the
 * scroll position several times while rescaling and must not get animations.
 */
export function withInstantScroll(container: HTMLElement | null, rescale: () => void): void {
  if (!container || container.classList.contains(PDF_INSTANT_SCROLL_CLASS)) {
    rescale();
    return;
  }
  container.classList.add(PDF_INSTANT_SCROLL_CLASS);
  // Flush styles now: scroll writes use the last computed scroll-behavior, so
  // without this the class only takes effect after the rescale.
  void getComputedStyle(container).scrollBehavior;
  try {
    rescale();
  } finally {
    container.classList.remove(PDF_INSTANT_SCROLL_CLASS);
  }
}

/** screen − client offset of the current two-finger gesture, else null. */
let pinchOffset: [number, number] | null = null;
let listening = false;
const patchedApps = new WeakSet<object>();

function trackTouches(event: TouchEvent): void {
  const twoFingers = event.touches.length === 2;
  if (twoFingers) {
    const touch = event.touches[0];
    pinchOffset = [touch.screenX - touch.clientX, touch.screenY - touch.clientY];
  } else {
    pinchOffset = null;
  }
  document.getElementById('viewerContainer')?.classList.toggle(PDF_INSTANT_SCROLL_CLASS, twoFingers);
}

function listenToTouches(): void {
  if (listening) return;
  listening = true;
  // Capture phase: runs before pdf.js's own window listener for the same
  // event, so the offset and the class are current when it zooms.
  const options: AddEventListenerOptions = { capture: true, passive: true };
  for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel'] as const) {
    window.addEventListener(type, trackTouches, options);
  }
}

export function applyPdfPinchZoomFix(app: unknown): void {
  const pinchApp = app as PdfJsZoomApp | null;
  if (!pinchApp || typeof pinchApp.updateZoom !== 'function' || patchedApps.has(pinchApp)) return;
  patchedApps.add(pinchApp);
  listenToTouches();

  const updateZoom = pinchApp.updateZoom;
  pinchApp.updateZoom = function (steps, scaleFactor, origin) {
    // Only a pinch passes screen coordinates; wheel zoom already uses client ones.
    if (origin && pinchOffset) {
      origin = [origin[0] - pinchOffset[0], origin[1] - pinchOffset[1]];
    }
    return updateZoom.call(this, steps, scaleFactor, origin);
  };
}
