/**
 * Returns true when the given URL params indicate map view is active.
 * Single source of truth — use everywhere instead of checking `north` directly.
 */
export function isMapViewParams(params: Record<string, any>): boolean {
  return params['north'] != null && params['south'] != null &&
         params['east'] != null && params['west'] != null;
}

/**
 * Returns true when the active tab is the map tab.
 * The `tab` URL param is the source of truth for which results tab is open;
 * coords (north/south/east/west) are written/read by MapBrowseComponent but
 * may not yet be present right after switching to the map tab.
 */
export function isMapTab(params: Record<string, any>): boolean {
  return params['tab'] === 'map';
}
