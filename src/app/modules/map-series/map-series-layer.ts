import type { Map as OLMap, MapBrowserEvent } from 'ol';
import type { FeatureLike } from 'ol/Feature';
import Feature from 'ol/Feature';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Polygon from 'ol/geom/Polygon';
import Point from 'ol/geom/Point';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import Text from 'ol/style/Text';
import { fromLonLat, transformExtent } from 'ol/proj';
import { LatLng, LatLngBounds, MapSeriesSheet, ShapefilePolygon, SheetNeighbour } from './map-series.model';

const SHEET_STROKE = '#000000';
const SHEET_FILL = 'rgba(0, 0, 0, 0.3)';
const SHEET_FILL_HOVER = 'rgba(0, 0, 0, 0.5)';
const SHEET_FILL_SELECTED = 'rgba(2, 119, 189, 0.5)';
const SHEET_FILL_HIGHLIGHT = 'rgba(0, 99, 204, 0.45)';
const SHEET_STROKE_HIGHLIGHT = '#0063cc';
const GRID_STROKE = 'rgba(0, 0, 0, 0.3)';

/** Sheet numbers stay hidden until the sheets are large enough to label. */
const LABEL_MIN_RESOLUTION_FACTOR = 1;

type SheetFeature = Feature<Polygon> & { get(key: 'sheet'): MapSeriesSheet };

/**
 * Draws the sheets of a map series on the Allmaps viewer's OpenLayers map:
 * one vector layer for the sheets themselves, one for the optional grid
 * overlay, and one for the sheet numbers and neighbour arrows.
 *
 * The viewer's own click handling is restricted to its outline layer, so
 * sheet interaction is wired up here against the shared map instance.
 */
export class MapSeriesLayer {
  private readonly sheetSource = new VectorSource<Feature<Polygon>>();
  private readonly gridSource = new VectorSource<Feature<Polygon>>();
  private readonly labelSource = new VectorSource<Feature<Point>>();

  private readonly sheetLayer: VectorLayer<VectorSource<Feature<Polygon>>>;
  private readonly gridLayer: VectorLayer<VectorSource<Feature<Polygon>>>;
  private readonly labelLayer: VectorLayer<VectorSource<Feature<Point>>>;

  private selectedSheet?: MapSeriesSheet;
  private hoveredSheet?: MapSeriesSheet;
  /** Sheet pointed at from the results list, highlighted without selecting it. */
  private highlightedSheet?: MapSeriesSheet;

  /** Below this resolution sheet numbers are drawn. */
  private labelMaxResolution = Infinity;

  private sheets: MapSeriesSheet[] = [];

  private readonly onClick = (event: MapBrowserEvent<UIEvent>) => {
    const sheet = this.sheetAtPixel(event.pixel);
    if (sheet) {
      this.clickHandler(sheet);
    }
  };

  private readonly onPointerMove = (event: MapBrowserEvent<UIEvent>) => {
    const sheet = this.sheetAtPixel(event.pixel);
    if (sheet === this.hoveredSheet) {
      return;
    }
    this.hoveredSheet = sheet;
    this.map.getTargetElement().style.cursor = sheet ? 'pointer' : '';
    this.sheetLayer.changed();
  };

  constructor(
    private readonly map: OLMap,
    private readonly clickHandler: (sheet: MapSeriesSheet) => void
  ) {
    this.gridLayer = new VectorLayer({
      source: this.gridSource,
      visible: false,
      style: new Style({
        stroke: new Stroke({ color: GRID_STROKE, width: 1 })
      })
    });

    this.sheetLayer = new VectorLayer({
      source: this.sheetSource,
      style: (feature: FeatureLike) => this.sheetStyle(feature as SheetFeature)
    });

    this.labelLayer = new VectorLayer({
      source: this.labelSource,
      style: (feature: FeatureLike, resolution: number) =>
        resolution > this.labelMaxResolution ? undefined : this.labelStyle(feature)
    });

    this.map.addLayer(this.gridLayer);
    this.map.addLayer(this.sheetLayer);
    this.map.addLayer(this.labelLayer);

    this.map.on('click', this.onClick);
    this.map.on('pointermove', this.onPointerMove);
  }

  /** Replaces the drawn sheets and their number labels. */
  setSheets(sheets: MapSeriesSheet[]): void {
    this.sheets = sheets;
    this.selectedSheet = undefined;
    this.hoveredSheet = undefined;
    this.highlightedSheet = undefined;
    this.sheetSource.clear();
    this.labelSource.clear();

    for (const sheet of sheets) {
      const feature = new Feature({
        geometry: new Polygon([toRing(sheet.position)]),
        sheet
      });
      this.sheetSource.addFeature(feature);

      if (sheet.center) {
        this.labelSource.addFeature(new Feature({
          geometry: new Point(fromLonLat([sheet.center.lng, sheet.center.lat])),
          label: sheet.map_number
        }));
      }
    }
  }

  /**
   * Replaces the grid overlay read from the published GeoJSON: every sheet the
   * series is made of, including the ones the library does not hold. The sheets
   * themselves are always drawn; this is the outline around the gaps.
   */
  setGrid(grid: ShapefilePolygon[]): void {
    this.gridSource.clear();
    for (const polygon of grid) {
      this.gridSource.addFeature(new Feature({
        geometry: new Polygon([toRing(polygon.position)])
      }));
    }
  }

  setGridVisible(visible: boolean): void {
    this.gridLayer.setVisible(visible);
  }

  /** Arrow markers pointing at the sheets bordering the selected one. */
  setNeighbours(neighbours: SheetNeighbour[]): void {
    this.labelSource.getFeatures()
      .filter(feature => feature.get('neighbour'))
      .forEach(feature => this.labelSource.removeFeature(feature));

    for (const neighbour of neighbours) {
      this.labelSource.addFeature(new Feature({
        geometry: new Point(fromLonLat([
          neighbour.markerPosition.lng,
          neighbour.markerPosition.lat
        ])),
        label: neighbour.map_number,
        neighbour: true
      }));
    }
  }

  setSelected(sheet: MapSeriesSheet | undefined): void {
    this.selectedSheet = sheet;
    this.sheetLayer.changed();
  }

  /** Highlights the sheet holding a given map, for hover from the results list. */
  highlightByPid(pid: string | null): void {
    const next = pid
      ? this.sheets.find(sheet => sheet.maps.some(m => m.pid === pid))
      : undefined;
    if (next === this.highlightedSheet) {
      return;
    }
    this.highlightedSheet = next;
    this.sheetLayer.changed();
  }

  /**
   * Sheet numbers appear once sheets are drawn large enough to hold them,
   * standing in for the zoom threshold the Google Maps view used.
   */
  setLabelThreshold(sheets: MapSeriesSheet[]): void {
    const first = sheets.find(sheet => sheet.position.length === 4);
    if (!first) {
      this.labelMaxResolution = Infinity;
      return;
    }
    const widthInDegrees = Math.abs(first.position[0].lng - first.position[2].lng);
    // Degrees to metres at the equator, spread over a typical sheet's pixel width.
    this.labelMaxResolution = (widthInDegrees * 111320 / 120) * LABEL_MIN_RESOLUTION_FACTOR;
    this.labelLayer.changed();
  }

  /** Fits the view to a lon/lat extent. */
  fitBounds(bounds: LatLngBounds): void {
    const extent = transformExtent(
      [bounds.west, bounds.south, bounds.east, bounds.north],
      'EPSG:4326',
      this.map.getView().getProjection()
    );
    if (!extent.every(Number.isFinite)) {
      return;
    }
    this.map.getView().fit(extent, {
      size: this.map.getSize(),
      padding: [20, 20, 20, 20]
    });
  }

  /** Sheets whose centre lies inside the current viewport. */
  sheetsInView(sheets: MapSeriesSheet[]): MapSeriesSheet[] {
    const extent = transformExtent(
      this.map.getView().calculateExtent(this.map.getSize()),
      this.map.getView().getProjection(),
      'EPSG:4326'
    );
    const [west, south, east, north] = extent;
    return sheets.filter(sheet =>
      !!sheet.center
      && sheet.center.lat > south
      && sheet.center.lat < north
      && sheet.center.lng > west
      && sheet.center.lng < east);
  }

  /** Steps the view one zoom level in or out, as the viewer controls do. */
  zoomBy(delta: number): void {
    const view = this.map.getView();
    const zoom = view.getZoom();
    if (zoom !== undefined) {
      view.animate({ zoom: zoom + delta, duration: 250 });
    }
  }

  destroy(): void {
    this.map.un('click', this.onClick);
    this.map.un('pointermove', this.onPointerMove);
    this.map.removeLayer(this.gridLayer);
    this.map.removeLayer(this.sheetLayer);
    this.map.removeLayer(this.labelLayer);
    this.sheetSource.clear();
    this.gridSource.clear();
    this.labelSource.clear();
  }

  private sheetAtPixel(pixel: number[]): MapSeriesSheet | undefined {
    const feature = this.map.forEachFeatureAtPixel(
      pixel,
      candidate => candidate,
      { layerFilter: layer => layer === this.sheetLayer }
    );
    return feature ? (feature.get('sheet') as MapSeriesSheet) : undefined;
  }

  private sheetStyle(feature: SheetFeature): Style {
    const sheet = feature.get('sheet');
    let fill = SHEET_FILL;
    let stroke = SHEET_STROKE;
    let width = 1;
    if (sheet === this.highlightedSheet) {
      fill = SHEET_FILL_HIGHLIGHT;
      stroke = SHEET_STROKE_HIGHLIGHT;
      width = 2;
    } else if (sheet === this.selectedSheet) {
      fill = SHEET_FILL_SELECTED;
    } else if (sheet === this.hoveredSheet) {
      fill = SHEET_FILL_HOVER;
    }
    return new Style({
      stroke: new Stroke({ color: stroke, width }),
      fill: new Fill({ color: fill })
    });
  }

  private labelStyle(feature: FeatureLike): Style {
    return new Style({
      text: new Text({
        text: String(feature.get('label') ?? ''),
        font: 'lighter 18px sans-serif',
        fill: new Fill({ color: '#ffffff' }),
        stroke: new Stroke({ color: 'rgba(0, 0, 0, 0.6)', width: 3 })
      })
    });
  }
}

/** Closes a sheet's corners into a projected linear ring. */
function toRing(position: LatLng[]): number[][] {
  const ring = position.map(({ lat, lng }) => fromLonLat([lng, lat]));
  return [...ring, ring[0]];
}
