import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EnvironmentService } from '../../shared/services/environment.service';
import { SEARCH_RETURN_FIELDS } from '../search-results-page/const/search-return-fields';
import { MAP_SERIES_SHAPEFILES } from './map-series.shapefiles';
import { LatLng, MapSeriesItem, ShapefilePolygon } from './map-series.model';

/**
 * Data access for the map series ("klad mapových listů") view: the list of
 * series in the root collection, the sheets of one series, and the GeoJSON
 * grid overlay published for a series on GitHub.
 */
@Injectable({ providedIn: 'root' })
export class MapSeriesService {
  private http = inject(HttpClient);
  private env = inject(EnvironmentService);

  /**
   * Collection holding every map series. Only this one collection offers the
   * map series view, matching the previous client.
   */
  readonly rootCollectionUuid = 'uuid:ee2388c6-7343-4a7f-9287-15bc8b564cbf';

  /** Map centre and zoom shared by the series view. */
  readonly center: LatLng = { lat: 49.5, lng: 15 };

  zoom = 7;

  private get apiUrl(): string {
    return this.env.getApiUrl('search');
  }

  /** Series (sub-collections) of the root collection, for the series menu. */
  getSeriesList(): Observable<MapSeriesItem[]> {
    const params = new HttpParams({
      fromObject: {
        q: `in_collections.direct:"${this.rootCollectionUuid}" AND model:collection`,
        fl: 'title.search,pid',
        rows: '100',
        wt: 'json'
      }
    });
    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(res => (res.response?.docs ?? []).map((doc: any) => ({
        name: doc['title.search'],
        pid: doc.pid
      })))
    );
  }

  /**
   * Raw Solr docs for every map belonging to one series. Requests the standard
   * search fields on top of the map-specific ones so each map can be rendered
   * as an ordinary record card (licences, accessibility, favourites) in the
   * results sidebar, not just as a title and a date.
   */
  getSeriesDocuments(pid: string): Observable<any[]> {
    const fields = [
      ...SEARCH_RETURN_FIELDS,
      'shelf_locators',
      'coords.bbox.center',
      'coords.bbox.corner_ne',
      'coords.bbox.corner_sw',
      'date_range_end.year'
    ];
    const params = new HttpParams({
      fromObject: {
        q: `in_collections.direct:"${pid}"`,
        fl: fields.join(','),
        rows: '2000',
        wt: 'json'
      }
    });
    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(res => res.response?.docs ?? [])
    );
  }

  /** GeoJSON grid published for a series, or null when none is configured. */
  getShapefileUrl(pid: string): string | null {
    return MAP_SERIES_SHAPEFILES.find(x => x.pid === pid)?.shapefile ?? null;
  }

  loadShapefile(url: string): Observable<ShapefilePolygon[]> {
    return this.http.get<any>(url).pipe(
      map(file => normalizeShapefile(file.features ?? []))
    );
  }
}

/**
 * GeoJSON features to polygon paths. Only the first four coordinates of each
 * feature are read — the published grids are rectangles.
 */
export function normalizeShapefile(features: any[]): ShapefilePolygon[] {
  const shapefile: ShapefilePolygon[] = [];
  for (const feature of features) {
    const ring = feature.geometry?.coordinates?.[0];
    if (!ring) {
      continue;
    }
    shapefile.push({
      position: [0, 1, 2, 3].map(i => ({ lat: ring[i][1], lng: ring[i][0] }))
    });
  }
  return shapefile;
}
