import { LatLng, MapSeriesSheet, MapSeriesPoint, NormalizedSeries, SheetNeighbour } from './map-series.model';
import { parseSearchDocument } from '../models/search-document';

/**
 * Joins the distinct parts of a multi-valued shelf locator into one string.
 */
export function normalizeShelfLocator(shelfLocator: string[]): string {
  let normalized = '';
  for (const part of shelfLocator) {
    if (!normalized.includes(part)) {
      normalized = normalized.length > 0 ? `${normalized},${part}` : part;
    }
  }
  return normalized;
}

/**
 * Sheet number as printed on the map, parsed out of the shelf locator. The
 * part after the first comma carries it, in several historical spellings.
 */
export function parseSheetNumber(shelfLocators: string[] | undefined): string {
  if (!shelfLocators || shelfLocators.length === 0) {
    return '?';
  }
  const shelfLocator = shelfLocators.length < 2
    ? shelfLocators[0]
    : normalizeShelfLocator(shelfLocators);
  if (!shelfLocator) {
    return '?';
  }
  const rest = shelfLocator.split(',')[1];
  if (!rest) {
    return '?';
  }
  if (rest.includes('/') || rest.split('-').length - 1 > 2) {
    return rest.substring(0, rest.lastIndexOf('-'));
  }
  return rest.split('-')[0];
}

/**
 * Date label of a map: a single year, or a range. Series records carry an end
 * year that the standard `date.str` does not, so the label is built here.
 */
function buildDate(record: any): string {
  const start = record['date_range_start.year'];
  const end = record['date_range_end.year'];
  return start === end ? String(start ?? '') : `${start} - ${end}`;
}

/**
 * Turns Solr docs into the rectangles drawn on the map. Maps sharing a
 * bounding box are merged into one sheet, so a single rectangle can hold
 * several documents. A doc whose corners are identical is a point, not a
 * sheet. Also computes the bounds of the whole series and the zoom level at
 * which sheet-number markers appear.
 */
export function normalizeSeriesDocuments(data: any[]): NormalizedSeries {
  const points: MapSeriesPoint[] = [];
  const polygons: MapSeriesSheet[] = [];
  let widthOfBox: number | undefined;
  let maxN: number | undefined;
  let maxE: number | undefined;
  let maxS: number | undefined;
  let maxW: number | undefined;

  for (const record of data) {
    const ne = record['coords.bbox.corner_ne'];
    const sw = record['coords.bbox.corner_sw'];
    if (!ne || !sw) {
      continue;
    }

    const lat1 = Number(ne.split(',')[0]);
    const lng1 = Number(ne.split(',')[1]);
    const lat2 = Number(sw.split(',')[0]);
    const lng2 = Number(sw.split(',')[1]);

    if (maxN === undefined || maxE === undefined || maxS === undefined || maxW === undefined) {
      maxN = lat1;
      maxE = lng1;
      maxS = lat2;
      maxW = lng2;
      widthOfBox = maxE - maxW;
    }

    // Bounds of the whole series.
    maxN = Math.max(maxN, lat1);
    maxS = Math.min(maxS, lat2);
    maxE = Math.max(maxE, lng1);
    maxW = Math.min(maxW, lng2);

    if (ne === sw) {
      points.push({
        coord_ne: ne,
        coord_sw: sw,
        position: { lat: lat1, lng: lng1 },
        maps: [parseSearchDocument(record)]
      });
      continue;
    }

    // The series' own year range wins over the generic `date.str`.
    const sheetMap = { ...parseSearchDocument(record), date: buildDate(record) };

    // Several maps on one sheet.
    const existing = polygons.find(e => e.coord_ne === ne && e.coord_sw === sw);
    if (existing) {
      existing.maps.push(sheetMap);
      continue;
    }

    const center = record['coords.bbox.center']
      ? {
        lat: Number(record['coords.bbox.center'].split(',')[0]),
        lng: Number(record['coords.bbox.center'].split(',')[1])
      }
      : undefined;

    polygons.push({
      coord_ne: ne,
      coord_sw: sw,
      position: [
        { lat: lat1, lng: lng1 },
        { lat: lat2, lng: lng1 },
        { lat: lat2, lng: lng2 },
        { lat: lat1, lng: lng2 }
      ],
      map_number: parseSheetNumber(record['shelf_locators']),
      center,
      maps: [sheetMap]
    });
  }

  let zoomForMarkers = 6;
  if (widthOfBox !== undefined) {
    if (widthOfBox < 0.25) {
      zoomForMarkers = 10;
    } else if (widthOfBox < 0.5) {
      zoomForMarkers = 8;
    } else if (widthOfBox < 2) {
      zoomForMarkers = 6;
    } else {
      zoomForMarkers = 5;
    }
  }

  return {
    points,
    polygons: polygons.sort((a, b) => Number(a.map_number) - Number(b.map_number)),
    maxbounds: {
      north: maxN ?? 0,
      south: maxS ?? 0,
      east: maxE ?? 0,
      west: maxW ?? 0
    },
    zoomForMarkers
  };
}

/**
 * Sheets directly north, south, east and west of the selected one, found by
 * matching shared corners. Coordinates come from the same source for every
 * sheet of a series, so an exact match is what identifies an edge.
 */
export function findNeighbours(polygons: MapSeriesSheet[], position: LatLng[]): SheetNeighbour[] {
  const neighbourN = polygons.find(x =>
    x.position[2].lat === position[3].lat
    && x.position[2].lng === position[3].lng
    && x.position[1].lng === position[0].lng);
  const neighbourE = polygons.find(x =>
    x.position[3].lat === position[0].lat
    && x.position[3].lng === position[0].lng
    && x.position[2].lng === position[1].lng);
  const neighbourS = polygons.find(x =>
    x.position[3].lat === position[2].lat
    && x.position[3].lng === position[2].lng
    && x.position[0].lng === position[1].lng);
  const neighbourW = polygons.find(x =>
    x.position[0].lat === position[3].lat
    && x.position[0].lng === position[3].lng
    && x.position[1].lng === position[2].lng);

  const neighbours: SheetNeighbour[] = [];
  if (neighbourN) {
    neighbours.push({
      compass: 'N',
      markerPosition: {
        lat: neighbourN.position[2].lat + 0.01,
        lng: (neighbourN.position[2].lng + neighbourN.position[1].lng) / 2
      },
      position: neighbourN.position,
      map_number: '▲'
    });
  }
  if (neighbourS) {
    neighbours.push({
      compass: 'S',
      markerPosition: {
        lat: neighbourS.position[3].lat - 0.01,
        lng: (neighbourS.position[3].lng + neighbourS.position[0].lng) / 2
      },
      position: neighbourS.position,
      map_number: '▼'
    });
  }
  if (neighbourE) {
    neighbours.push({
      compass: 'E',
      markerPosition: {
        lat: (neighbourE.position[3].lat + neighbourE.position[2].lat) / 2,
        lng: neighbourE.position[3].lng + 0.02
      },
      position: neighbourE.position,
      map_number: '►'
    });
  }
  if (neighbourW) {
    neighbours.push({
      compass: 'W',
      markerPosition: {
        lat: (neighbourW.position[0].lat + neighbourW.position[1].lat) / 2,
        lng: neighbourW.position[0].lng - 0.02
      },
      position: neighbourW.position,
      map_number: '◄'
    });
  }
  return neighbours;
}

/** Maps of a sheet, oldest first. */
export function chronoSort<T extends { date?: string }>(maps: T[]): T[] {
  return [...maps].sort((a, b) =>
    Number(String(a.date).substring(0, 4)) - Number(String(b.date).substring(0, 4)));
}

/** Series sorted by name, for the series menu. */
export function alphabetSort<T extends { name: string }>(series: T[]): T[] {
  return [...series].sort((a, b) => a.name.localeCompare(b.name));
}
