import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  NgZone,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, skip } from 'rxjs/operators';
import { MapSearchService, MapBounds } from '../../../../shared/services/map-search.service';
import { MapService } from '../../../../shared/services/map.service';
import { SearchService } from '../../../../shared/services/search.service';
import { SearchDocument } from '../../../models/search-document';
import { GoogleMap, GoogleMapsModule } from '@angular/google-maps';
import { AsyncPipe, NgIf } from '@angular/common';
import { SearchResultsSidebarComponent } from '../../../../shared/components/metadata-sidebar/search-results-sidebar/search-results-sidebar.component';
import { SelectedTagsComponent } from '../../../../shared/components/selected-tags/selected-tags.component';
import { TranslatePipe } from '@ngx-translate/core';
import type { AllmapsViewer } from '@allmaps/viewer-lite';
import { ConfigService } from '../../../../core/config/config.service';

const EARTH_RADIUS = 6378137;

function lonLatToMercator(lon: number, lat: number): [number, number] {
  const x = (lon * Math.PI / 180) * EARTH_RADIUS;
  const clampedLat = Math.max(Math.min(lat, 85.0511287798), -85.0511287798);
  const y = Math.log(Math.tan(Math.PI / 4 + (clampedLat * Math.PI / 180) / 2)) * EARTH_RADIUS;
  return [x, y];
}

@Component({
  selector: 'app-map-browse',
  standalone: true,
  imports: [
    GoogleMapsModule,
    AsyncPipe,
    NgIf,
    SearchResultsSidebarComponent,
    SelectedTagsComponent,
    TranslatePipe
  ],
  templateUrl: './map-browse.component.html',
  styleUrl: './map-browse.component.scss'
})
export class MapBrowseComponent implements AfterViewInit, OnDestroy {
  @ViewChild('googleMap') googleMap!: GoogleMap;
  @ViewChild('viewerEl') viewerEl?: ElementRef<HTMLElement>;

  mapSearchService = inject(MapSearchService);
  searchService = inject(SearchService);
  private mapService = inject(MapService);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private configService = inject(ConfigService);

  readonly useAllmaps = this.configService.features.mapProvider === 'allmaps';

  mapReady = false;
  focusedBounds: google.maps.LatLngBoundsLiteral | null = null;

  mapOptions: google.maps.MapOptions = {
    center: { lat: 49.8, lng: 15.5 },
    zoom: 7,
    mapTypeId: 'roadmap',
    fullscreenControl: false,
    streetViewControl: false,
    zoomControl: false,
  };

  private viewer: AllmapsViewer | null = null;
  private destroyed = false;
  private boundsDebounce$ = new Subject<MapBounds>();
  private subs: Subscription[] = [];
  private _initialPageConsumed = false;
  private _mapSettled = false;

  async ngAfterViewInit(): Promise<void> {
    const params = this.route.snapshot.queryParams;
    let initialBounds: MapBounds | null = null;
    if (params['north'] && params['south'] && params['east'] && params['west']) {
      const n = +params['north'], s = +params['south'],
        e = +params['east'], w = +params['west'];
      initialBounds = { north: n, south: s, east: e, west: w };
      if (!this.useAllmaps) {
        this.mapOptions = {
          ...this.mapOptions,
          center: { lat: (n + s) / 2, lng: (e + w) / 2 },
        };
      }
    }

    const initialPage = Math.max(0, (+this.route.snapshot.queryParams['page'] || 1) - 1);

    // Debounce bounds → search + update URL
    this.subs.push(
      this.boundsDebounce$.pipe(
        debounceTime(400),
        distinctUntilChanged((a, b) =>
          a.north === b.north && a.south === b.south &&
          a.east === b.east && a.west === b.west
        )
      ).subscribe(bounds => {
        const page = this._initialPageConsumed ? 0 : initialPage;
        this.mapSearchService.searchByBounds(bounds, page);
        this._initialPageConsumed = true;
        this.updateUrl(bounds, page + 1);
      })
    );

    // Re-search when filters/query change, but NOT when only bounds/page coords change
    const IGNORED_KEYS = new Set(['north', 'south', 'east', 'west', 'page']);
    this.subs.push(
      this.route.queryParams.pipe(
        map(p => {
          const filtered: Record<string, string> = {};
          for (const k of Object.keys(p)) {
            if (!IGNORED_KEYS.has(k)) filtered[k] = p[k];
          }
          return JSON.stringify(filtered);
        }),
        distinctUntilChanged(),
        skip(1)
      ).subscribe(() => {
        this.mapSearchService.refreshWithCurrentBounds();
      })
    );

    if (this.useAllmaps) {
      await this.initAllmapsViewer(initialBounds, initialPage);
    } else {
      this.initGoogleMap(initialBounds, initialPage);
    }
  }

  private initGoogleMap(initialBounds: MapBounds | null, initialPage: number): void {
    this.mapService.init(() => {
      this.ngZone.run(() => {
        this.mapReady = true;
        this.cdr.detectChanges();

        if (initialBounds && this.googleMap?.googleMap) {
          this.mapSearchService.searchByBounds(initialBounds, initialPage);
          this._initialPageConsumed = true;

          this.googleMap.googleMap.fitBounds({
            north: initialBounds.north, south: initialBounds.south,
            east: initialBounds.east, west: initialBounds.west
          }, 0);

          google.maps.event.addListenerOnce(this.googleMap.googleMap, 'idle', () => {
            setTimeout(() => { this._mapSettled = true; });
          });
        } else {
          this._mapSettled = true;
        }
      });
    });
  }

  private async initAllmapsViewer(initialBounds: MapBounds | null, initialPage: number): Promise<void> {
    try {
      const { createAllmapsViewer } = await import('@allmaps/viewer-lite');
      if (this.destroyed || !this.viewerEl) return;

      const viewer = createAllmapsViewer(this.viewerEl.nativeElement, {
        maps: [],
        basemap: 'osm',
        fitOnInit: false
      });
      this.viewer = viewer;

      viewer.setOutlineStyle({
        strokeColor: '#0063cc',
        strokeWidth: 2,
        fillColor: 'rgba(0, 99, 204, 0.2)'
      });

      this.ngZone.run(() => {
        this.mapReady = true;
        this.cdr.detectChanges();
      });

      if (initialBounds) {
        const [minX, minY] = lonLatToMercator(initialBounds.west, initialBounds.south);
        const [maxX, maxY] = lonLatToMercator(initialBounds.east, initialBounds.north);
        viewer.map.getView().fit([minX, minY, maxX, maxY], {
          size: viewer.map.getSize(),
          padding: [20, 20, 20, 20]
        });
        this.mapSearchService.searchByBounds(initialBounds, initialPage);
        this._initialPageConsumed = true;
        setTimeout(() => { this._mapSettled = true; });
      } else {
        viewer.map.getView().setCenter(lonLatToMercator(15.5, 49.8));
        viewer.map.getView().setZoom(7);
        this._mapSettled = true;
      }

      viewer.on('viewportchange', (event) => {
        if (!this._mapSettled) return;
        const b = event.detail.bounds;
        this.ngZone.run(() => {
          this.boundsDebounce$.next({
            north: b.north, south: b.south, east: b.east, west: b.west
          });
        });
      });
    } catch (err) {
      console.error('Failed to initialize Allmaps viewer', err);
    }
  }

  onIdle(): void {
    if (!this._mapSettled) return;
    this.triggerSearch();
  }

  private triggerSearch(): void {
    const bounds = this.googleMap?.getBounds();
    if (!bounds) return;
    this.boundsDebounce$.next({
      north: bounds.getNorthEast().lat(),
      south: bounds.getSouthWest().lat(),
      east: bounds.getNorthEast().lng(),
      west: bounds.getSouthWest().lng()
    });
  }

  private updateUrl(bounds: MapBounds, page = 1): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        north: bounds.north,
        south: bounds.south,
        east: bounds.east,
        west: bounds.west,
        page,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  getRectangleOptions(): google.maps.RectangleOptions {
    return {
      fillColor: '#0063cc',
      fillOpacity: 0.2,
      strokeColor: '#0063cc',
      strokeWeight: 2
    };
  }

  onItemHover(doc: SearchDocument): void {
    if (doc.north == null || doc.south == null || doc.east == null || doc.west == null) {
      this.focusedBounds = null;
      this.viewer?.hidePreview();
      return;
    }
    if (this.useAllmaps) {
      this.viewer?.showPreviewGeometry({
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [doc.west, doc.south],
            [doc.east, doc.south],
            [doc.east, doc.north],
            [doc.west, doc.north],
            [doc.west, doc.south]
          ]]
        },
        dataProjection: 'EPSG:4326'
      });
    } else {
      this.focusedBounds = { north: doc.north, south: doc.south, east: doc.east, west: doc.west };
    }
  }

  onItemLeave(): void {
    this.focusedBounds = null;
    this.viewer?.hidePreview();
  }

  onPageChange(page: number): void {
    this.mapSearchService.goToPage(page - 1);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  onMapClick(): void {
    this.focusedBounds = null;
  }

  zoomIn(): void {
    if (this.useAllmaps) {
      const view = this.viewer?.map.getView();
      if (!view) return;
      view.setZoom((view.getZoom() ?? 7) + 1);
    } else {
      const current = this.googleMap.getZoom() ?? 7;
      this.googleMap.googleMap?.setZoom(current + 1);
    }
  }

  zoomOut(): void {
    if (this.useAllmaps) {
      const view = this.viewer?.map.getView();
      if (!view) return;
      view.setZoom((view.getZoom() ?? 7) - 1);
    } else {
      const current = this.googleMap.getZoom() ?? 7;
      this.googleMap.googleMap?.setZoom(current - 1);
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.boundsDebounce$.complete();
    this.subs.forEach(s => s.unsubscribe());
    this.mapSearchService.clear();
    try {
      this.viewer?.destroy();
    } catch {
      /* noop */
    }
    this.viewer = null;
  }
}
