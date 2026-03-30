/**
 * Returns true when the given URL params indicate map view is active.
 * Single source of truth — use everywhere instead of checking `north` directly.
 */
export function isMapViewParams(params: Record<string, any>): boolean {
  return params['north'] != null && params['south'] != null &&
         params['east'] != null && params['west'] != null;
}
