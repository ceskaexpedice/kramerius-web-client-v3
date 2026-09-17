import {
  chronoSort,
  findNeighbours,
  normalizeSeriesDocuments,
  normalizeShelfLocator,
  parseSheetNumber
} from './map-series.utils';
import { MapSeriesSheet } from './map-series.model';

function doc(overrides: any = {}) {
  return {
    pid: 'uuid:1',
    'title.search': 'Mapa',
    'coords.bbox.corner_ne': '50,16',
    'coords.bbox.corner_sw': '49,15',
    'coords.bbox.center': '49.5,15.5',
    'date_range_start.year': 1900,
    'date_range_end.year': 1900,
    shelf_locators: ['MZK, 4-0123-1'],
    ...overrides
  };
}

describe('normalizeShelfLocator', () => {
  it('joins distinct parts', () => {
    expect(normalizeShelfLocator(['A', 'B'])).toBe('A,B');
  });

  it('skips parts already contained', () => {
    expect(normalizeShelfLocator(['A', 'A'])).toBe('A');
  });
});

describe('parseSheetNumber', () => {
  // The locator is split on the comma and never trimmed, so the separating
  // space stays part of the sheet number, as in the previous client.
  it('takes the part after the comma up to the first dash', () => {
    expect(parseSheetNumber(['MZK, 4051-1'])).toBe(' 4051');
  });

  it('keeps everything before the last dash when a slash is present', () => {
    expect(parseSheetNumber(['MZK, 4051/1-2'])).toBe(' 4051/1');
  });

  it('keeps everything before the last dash when there are more than two dashes', () => {
    expect(parseSheetNumber(['MZK, 4-0-51-1'])).toBe(' 4-0-51');
  });

  it('returns the number without a space when the locator has none', () => {
    expect(parseSheetNumber(['MZK,4051-1'])).toBe('4051');
  });

  it('falls back to ? without a shelf locator', () => {
    expect(parseSheetNumber(undefined)).toBe('?');
    expect(parseSheetNumber([])).toBe('?');
  });

  it('falls back to ? when there is nothing after the comma', () => {
    expect(parseSheetNumber(['MZK'])).toBe('?');
  });
});

describe('normalizeSeriesDocuments', () => {
  it('builds a rectangle from the bounding box corners', () => {
    const { polygons } = normalizeSeriesDocuments([doc()]);
    expect(polygons.length).toBe(1);
    expect(polygons[0].position).toEqual([
      { lat: 50, lng: 16 },
      { lat: 49, lng: 16 },
      { lat: 49, lng: 15 },
      { lat: 50, lng: 15 }
    ]);
  });

  it('merges maps sharing a bounding box into one sheet', () => {
    const { polygons } = normalizeSeriesDocuments([
      doc({ pid: 'uuid:1' }),
      doc({ pid: 'uuid:2', 'title.search': 'Druhá mapa' })
    ]);
    expect(polygons.length).toBe(1);
    expect(polygons[0].maps.map(m => m.pid)).toEqual(['uuid:1', 'uuid:2']);
  });

  it('keeps maps with different bounding boxes apart', () => {
    const { polygons } = normalizeSeriesDocuments([
      doc({ pid: 'uuid:1' }),
      doc({
        pid: 'uuid:2',
        'coords.bbox.corner_ne': '52,18',
        'coords.bbox.corner_sw': '51,17'
      })
    ]);
    expect(polygons.length).toBe(2);
  });

  it('treats identical corners as a point, not a sheet', () => {
    const { points, polygons } = normalizeSeriesDocuments([
      doc({ 'coords.bbox.corner_ne': '50,16', 'coords.bbox.corner_sw': '50,16' })
    ]);
    expect(points.length).toBe(1);
    expect(polygons.length).toBe(0);
    expect(points[0].position).toEqual({ lat: 50, lng: 16 });
  });

  it('skips documents without coordinates', () => {
    const { points, polygons } = normalizeSeriesDocuments([
      doc({ 'coords.bbox.corner_ne': undefined, 'coords.bbox.corner_sw': undefined })
    ]);
    expect(points.length).toBe(0);
    expect(polygons.length).toBe(0);
  });

  it('spans the bounds across every sheet', () => {
    const { maxbounds } = normalizeSeriesDocuments([
      doc(),
      doc({
        pid: 'uuid:2',
        'coords.bbox.corner_ne': '52,18',
        'coords.bbox.corner_sw': '51,17'
      })
    ]);
    expect(maxbounds).toEqual({ north: 52, south: 49, east: 18, west: 15 });
  });

  it('shows a single year as the date, and a span as a range', () => {
    // Always a string: SearchDocument.date is typed as one.
    const single = normalizeSeriesDocuments([doc()]).polygons[0];
    expect(single.maps[0].date).toBe('1900');

    const ranged = normalizeSeriesDocuments([
      doc({ 'date_range_start.year': 1900, 'date_range_end.year': 1910 })
    ]).polygons[0];
    expect(ranged.maps[0].date).toBe('1900 - 1910');
  });

  it('picks the marker zoom from the width of the first sheet', () => {
    const wide = normalizeSeriesDocuments([
      doc({ 'coords.bbox.corner_ne': '50,20', 'coords.bbox.corner_sw': '49,15' })
    ]);
    expect(wide.zoomForMarkers).toBe(5);

    const narrow = normalizeSeriesDocuments([
      doc({ 'coords.bbox.corner_ne': '50,15.1', 'coords.bbox.corner_sw': '49,15' })
    ]);
    expect(narrow.zoomForMarkers).toBe(10);
  });

  it('returns empty bounds for no documents', () => {
    const result = normalizeSeriesDocuments([]);
    expect(result.polygons).toEqual([]);
    expect(result.maxbounds).toEqual({ north: 0, south: 0, east: 0, west: 0 });
  });
});

describe('findNeighbours', () => {
  // Two sheets side by side: `left` spans lng 15..16, `right` spans 16..17.
  function sheet(lngWest: number, lngEast: number, number: string): MapSeriesSheet {
    return {
      coord_ne: `50,${lngEast}`,
      coord_sw: `49,${lngWest}`,
      position: [
        { lat: 50, lng: lngEast },
        { lat: 49, lng: lngEast },
        { lat: 49, lng: lngWest },
        { lat: 50, lng: lngWest }
      ],
      map_number: number,
      maps: []
    };
  }

  it('finds the sheet to the west of the selected one', () => {
    const left = sheet(15, 16, '1');
    const right = sheet(16, 17, '2');
    const neighbours = findNeighbours([left, right], right.position);
    expect(neighbours.map(n => n.compass)).toEqual(['W']);
    expect(neighbours[0].map_number).toBe('◄');
  });

  it('finds the sheet to the east of the selected one', () => {
    const left = sheet(15, 16, '1');
    const right = sheet(16, 17, '2');
    const neighbours = findNeighbours([left, right], left.position);
    expect(neighbours.map(n => n.compass)).toEqual(['E']);
  });

  it('returns nothing for an isolated sheet', () => {
    const lone = sheet(15, 16, '1');
    const far = sheet(30, 31, '2');
    expect(findNeighbours([lone, far], lone.position)).toEqual([]);
  });
});

describe('chronoSort', () => {
  it('orders maps oldest first', () => {
    const sorted = chronoSort([{ date: '1910' }, { date: '1900' }]);
    expect(sorted.map(m => m.date)).toEqual(['1900', '1910']);
  });

  it('leaves the input untouched', () => {
    const input = [{ date: '1910' }, { date: '1900' }];
    chronoSort(input);
    expect(input.map(m => m.date)).toEqual(['1910', '1900']);
  });
});
