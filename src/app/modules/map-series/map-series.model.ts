import { SearchDocument } from '../models/search-document';

/** A geographic point. Mirrors the shape Solr returns, independent of any map library. */
export interface LatLng {
  lat: number;
  lng: number;
}

/** A geographic extent. */
export interface LatLngBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/** One map series (a sub-collection of the root map collection). */
export interface MapSeriesItem {
  name: string;
  pid: string;
}

/**
 * A single map belonging to a sheet. Carries the full search document so the
 * results sidebar can render it as an ordinary record card.
 */
export type SheetMap = SearchDocument;

/**
 * One sheet of a series: the rectangle drawn on the map. Several maps can
 * share a sheet when their bounding boxes are identical.
 */
export interface MapSeriesSheet {
  coord_ne: string;
  coord_sw: string;
  position: LatLng[];
  map_number: string;
  center?: LatLng;
  maps: SheetMap[];
}

/** A map whose bounding box collapses to a single point. */
export interface MapSeriesPoint {
  coord_ne: string;
  coord_sw: string;
  position: LatLng;
  maps: SheetMap[];
}

/** A rectangle of the GeoJSON grid overlay. */
export interface ShapefilePolygon {
  position: LatLng[];
}

/** Neighbouring sheet, shown as an arrow marker next to the selected one. */
export interface SheetNeighbour {
  compass: 'N' | 'S' | 'E' | 'W';
  markerPosition: LatLng;
  position: LatLng[];
  map_number: string;
}

/** Result of turning Solr docs into drawable sheets. */
export interface NormalizedSeries {
  points: MapSeriesPoint[];
  polygons: MapSeriesSheet[];
  maxbounds: LatLngBounds;
  zoomForMarkers: number;
}

/** Entry of the grid overlay table: series pid → published GeoJSON. */
export interface MapSeriesShapefile {
  name: string;
  pid: string;
  shapefile: string;
}
