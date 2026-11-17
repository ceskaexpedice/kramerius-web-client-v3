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

/** Set on `#viewerContainer` while two fingers are down; see pdf-viewer.scss. */
export const PDF_PINCHING_CLASS = 'cdk-pdf-pinching';

/** The bits of PDFViewerApplication this fix touches (untyped in the library). */
interface PinchZoomApp {
  updateZoom: (steps: number | null, scaleFactor?: number | null, origin?: [number, number] | null) => void;
  appConfig?: { viewerContainer?: HTMLElement };
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
  document.getElementById('viewerContainer')?.classList.toggle(PDF_PINCHING_CLASS, twoFingers);
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
  const pinchApp = app as PinchZoomApp | null;
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
