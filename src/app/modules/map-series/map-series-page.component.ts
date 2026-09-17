import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  NgZone,
  OnDestroy,
  signal,
  ViewChild
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ActionToolbarComponent } from '../../shared/components/action-toolbar/action-toolbar.component';
import { SelectComponent } from '../../shared/components/select/select.component';
import { SearchResultsSidebarComponent } from '../../shared/components/metadata-sidebar/search-results-sidebar/search-results-sidebar.component';
import { MobileNavBarComponent, MobileNavItem } from '../../shared/components/mobile-nav-bar/mobile-nav-bar.component';
import { BreakpointService } from '../../shared/services/breakpoint.service';
import { SearchDocument } from '../models/search-document';
import { CdkTooltipDirective } from '../../shared/directives';
import { BehaviorSubject, Observable, Subject, of, takeUntil } from 'rxjs';
import type { AllmapsViewer } from '@allmaps/viewer-lite';
import { MapSeriesService } from './map-series.service';
import { MapSeriesLayer } from './map-series-layer';
import { LatLngBounds, MapSeriesItem, MapSeriesSheet } from './map-series.model';
import { alphabetSort, chronoSort, findNeighbours, normalizeSeriesDocuments } from './map-series.utils';
import { APP_ROUTES_ENUM } from '../../app.routes';

/**
 * Map series view ("klad mapových listů"): the sheets of one map series drawn
 * as rectangles over a base map. A rectangle can hold several maps; selecting
 * one lists them and links through to the viewer.
 *
 * Rendering runs on the same Allmaps viewer the map search uses, with the
 * sheets themselves drawn by {@link MapSeriesLayer}.
 */
@Component({
  selector: 'app-map-series-page',
  standalone: true,
  imports: [
    TranslatePipe,
    ActionToolbarComponent,
    SelectComponent,
    SearchResultsSidebarComponent,
    MobileNavBarComponent,
    CdkTooltipDirective
  ],
  templateUrl: './map-series-page.component.html',
  styleUrl: './map-series-page.component.scss'
})
export class MapSeriesPageComponent implements AfterViewInit, OnDestroy {
  @ViewChild('viewerEl') viewerEl?: ElementRef<HTMLElement>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  mapSeriesService = inject(MapSeriesService);
  breakpointService = inject(BreakpointService);

  /**
   * The toolbar's tab strip is hidden on phones, so the same switch is offered
   * in the bottom nav bar — otherwise there is no way back to the documents.
   */
  readonly mobileNavItems: MobileNavItem[] = [
    { id: 'documents', label: 'map-series--view-documents', icon: 'icon-grid-6' },
    { id: 'map', label: 'map-series--view-map', icon: 'icon-map' }
  ];

  onMobileNavChange(id: string): void {
    if (id === 'documents') {
      this.goToCollectionView();
    }
  }

  mapSeries: MapSeriesItem[] = [];
  selectedSeries?: MapSeriesItem;

  /** Blocks the panel's pointer events while a tap's synthetic click settles. */
  readonly panelInert = signal(false);
  private panelInertTimer: ReturnType<typeof setTimeout> | null = null;

  /** Maps of the selected sheet, fed to the results sidebar. */
  readonly selectedMaps = signal<SearchDocument[]>([]);
  readonly selectedSheetNumber = signal<string>('');

  private readonly _selectedMaps$ = new BehaviorSubject<SearchDocument[]>([]);
  private readonly _selectedCount$ = new BehaviorSubject<number>(0);
  readonly selectedMaps$: Observable<SearchDocument[]> = this._selectedMaps$.asObservable();
  readonly selectedCount$: Observable<number> = this._selectedCount$.asObservable();
  /** The sheet's maps are already loaded, so the sidebar never shows a spinner. */
  readonly notLoading$: Observable<boolean> = of(false);

  hasGrid = false;
  gridVisible = false;
  mapReady = false;

  private viewer: AllmapsViewer | null = null;
  private layer?: MapSeriesLayer;
  private sheets: MapSeriesSheet[] = [];
  private maxbounds?: LatLngBounds;
  private destroyed = false;
  private destroy$ = new Subject<void>();

  async ngAfterViewInit(): Promise<void> {
    await this.initViewer();
    if (this.destroyed) {
      return;
    }
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const uuid = params.get('uuid');
        if (this.mapSeries.length === 0) {
          this.mapSeriesService.getSeriesList().subscribe(series => {
            this.mapSeries = series;
            this.openSeries(uuid);
          });
        } else {
          this.openSeries(uuid);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.panelInertTimer !== null) {
      clearTimeout(this.panelInertTimer);
    }
    this.destroy$.next();
    this.destroy$.complete();
    this.layer?.destroy();
    try {
      this.viewer?.destroy();
    } catch {
      /* noop */
    }
    this.viewer = null;
  }

  private async initViewer(): Promise<void> {
    try {
      const { createAllmapsViewer } = await import('@allmaps/viewer-lite');
      if (this.destroyed || !this.viewerEl) {
        return;
      }
      const viewer = createAllmapsViewer(this.viewerEl.nativeElement, {
        maps: [],
        basemap: 'esri-world-topo',
        fitOnInit: false
      });
      this.viewer = viewer;
      this.layer = new MapSeriesLayer(viewer.map, sheet =>
        this.ngZone.run(() => this.selectSheet(sheet)));

      viewer.on('viewportchange', () => {
        this.ngZone.run(() => this.cdr.markForCheck());
      });

      this.mapReady = true;
      this.cdr.detectChanges();
    } catch (err) {
      console.error('Failed to initialize Allmaps viewer', err);
    }
  }

  /** Opens the requested series, or the first one when none is given. */
  private openSeries(uuid: string | null): void {
    if (uuid && uuid !== this.mapSeriesService.rootCollectionUuid) {
      this.selectMapSeries(uuid);
    } else if (this.mapSeries.length > 0) {
      this.router.navigate([APP_ROUTES_ENUM.MAP_SERIES, this.mapSeries[0].pid]);
    }
  }

  private selectMapSeries(pid: string): void {
    this.clearSelection();
    this.selectedSeries = this.mapSeries.find(x => x.pid === pid);
    this.hasGrid = false;
    this.gridVisible = false;
    this.layer?.setGrid([]);
    this.layer?.setNeighbours([]);
    this.layer?.setGridVisible(false);

    const gridUrl = this.mapSeriesService.getShapefileUrl(pid);

    this.mapSeriesService.getSeriesDocuments(pid).subscribe(docs => {
      const normalized = normalizeSeriesDocuments(docs);
      this.sheets = normalized.polygons;
      this.maxbounds = normalized.maxbounds;

      this.layer?.setSheets(this.sheets);
      this.layer?.setLabelThreshold(this.sheets);

      if (this.sheets.length > 0) {
        this.fitToScreen();
      }
      this.cdr.markForCheck();

      if (gridUrl) {
        this.mapSeriesService.loadShapefile(gridUrl).subscribe({
          next: grid => {
            this.layer?.setGrid(grid);
            this.hasGrid = grid.length > 0;
            this.cdr.markForCheck();
          },
          error: () => { /* the grid overlay is optional */ }
        });
      }
    });
  }

  /**
   * A tap on the map arrives as touchstart/touchend plus a synthetic click a
   * moment later. The panel opens in between, so that trailing click would land
   * on whatever record card now sits under the finger and open it. Ignore
   * pointer events on the panel until the tap has fully played out.
   */
  private suppressPanelInput(): void {
    this.panelInert.set(true);
    if (this.panelInertTimer !== null) {
      clearTimeout(this.panelInertTimer);
    }
    this.panelInertTimer = setTimeout(() => {
      this.panelInert.set(false);
      this.panelInertTimer = null;
    }, 500);
  }

  private selectSheet(sheet: MapSeriesSheet): void {
    this.suppressPanelInput();
    const maps = chronoSort(sheet.maps);
    this.selectedMaps.set(maps);
    this.selectedSheetNumber.set(sheet.map_number);
    this._selectedMaps$.next(maps);
    this._selectedCount$.next(maps.length);
    this.layer?.setSelected(sheet);
    this.layer?.setNeighbours(findNeighbours(this.sheets, sheet.position));
    this.layer?.fitBounds({
      north: sheet.position[0].lat,
      south: sheet.position[2].lat,
      east: sheet.position[0].lng,
      west: sheet.position[2].lng
    });
    this.cdr.markForCheck();
  }

  closeSelected(): void {
    this.clearSelection();
    this.layer?.setSelected(undefined);
    this.layer?.setNeighbours([]);
  }

  private clearSelection(): void {
    this.selectedMaps.set([]);
    this.selectedSheetNumber.set('');
    this._selectedMaps$.next([]);
    this._selectedCount$.next(0);
    this.layer?.highlightByPid(null);
  }

  /** Pointing at a result outlines the sheet that map belongs to. */
  onItemHover(doc: SearchDocument): void {
    this.layer?.highlightByPid(doc?.pid ?? null);
  }

  onItemLeave(): void {
    this.layer?.highlightByPid(null);
  }

  zoomIn(): void {
    this.layer?.zoomBy(1);
  }

  zoomOut(): void {
    this.layer?.zoomBy(-1);
  }

  fitToScreen(): void {
    if (this.maxbounds) {
      this.layer?.fitBounds(this.maxbounds);
    }
  }

  toggleGrid(): void {
    this.gridVisible = !this.gridVisible;
    this.layer?.setGridVisible(this.gridVisible);
  }

  /**
   * Label for one series in the picker. Never empty: app-select runs the label
   * through translate.instant(), which throws on an empty key and would take
   * the whole view down with it before the viewer is created.
   */
  readonly seriesDisplayFn = (serie: MapSeriesItem | null): string =>
    serie?.name ?? '–';

  get seriesMenuItems(): MapSeriesItem[] {
    return alphabetSort(this.mapSeries);
  }

  changeMapSeries(pid: string): void {
    this.router.navigate([APP_ROUTES_ENUM.MAP_SERIES, pid]);
  }

  goToRootCollection(): void {
    this.router.navigate([APP_ROUTES_ENUM.COLLECTION, this.mapSeriesService.rootCollectionUuid]);
  }

  goToCollectionView(): void {
    if (this.selectedSeries) {
      this.router.navigate([APP_ROUTES_ENUM.COLLECTION, this.selectedSeries.pid]);
    }
  }

}
