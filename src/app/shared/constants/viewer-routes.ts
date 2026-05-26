import { APP_ROUTES_ENUM } from '../../app.routes';

/** Route segments that render a single item the user "drills into". */
export const VIEWER_ROUTE_SEGMENTS: string[] = [
  APP_ROUTES_ENUM.DETAIL_VIEW,
  APP_ROUTES_ENUM.PERIODICAL_VIEW,
  APP_ROUTES_ENUM.MUSIC_VIEW,
  APP_ROUTES_ENUM.MONOGRAPH_VIEW,
];

/**
 * True when `path` (a URL without its query string) points at an item viewer
 * (detail/periodical/music/monograph). The library prefix (e.g. /knav) is
 * stripped before matching the first route segment.
 */
export function isViewerRoutePath(path: string, libraryPrefix = ''): boolean {
  const withoutPrefix = libraryPrefix && path.startsWith(libraryPrefix) ? path.slice(libraryPrefix.length) : path;
  const firstSegment = withoutPrefix.split('/').filter(Boolean)[0] ?? '';
  return VIEWER_ROUTE_SEGMENTS.includes(firstSegment);
}
