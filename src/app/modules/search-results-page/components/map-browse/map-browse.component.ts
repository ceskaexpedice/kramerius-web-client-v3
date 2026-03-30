import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
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

  mapSearchService = inject(MapSearchService);
  searchService = inject(SearchService);
  private mapService = inject(MapService);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

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

  private boundsDebounce$ = new Subject<MapBounds>();
  private subs: Subscription[] = [];
  private _initialPageConsumed = false;
  private _mapSettled = false;

  ngAfterViewInit(): void {
    // Read initial bounds from URL and set map center/zoom before API loads
    const params = this.route.snapshot.queryParams;
    let initialBounds: MapBounds | null = null;
    if (params['north'] && params['south'] && params['east'] && params['west']) {
      const n = +params['north'], s = +params['south'],
            e = +params['east'], w = +params['west'];
      initialBounds = { north: n, south: s, east: e, west: w };
      this.mapOptions = {
        ...this.mapOptions,
        center: { lat: (n + s) / 2, lng: (e + w) / 2 },
      };
    }

    this.mapService.init(() => {
      this.ngZone.run(() => {
        this.mapReady = true;
        this.cdr.detectChanges();

        if (initialBounds && this.googleMap?.googleMap) {
          // Search immediately with URL bounds — no need to wait for idle
          const initialPage = Math.max(0, (+params['page'] || 1) - 1);
          this.mapSearchService.searchByBounds(initialBounds, initialPage);
          this._initialPageConsumed = true;

          // Fit map to saved bounds; the idle after this will be deduped
          this.googleMap.googleMap.fitBounds({
            north: initialBounds.north, south: initialBounds.south,
            east: initialBounds.east, west: initialBounds.west
          }, 0);

          // Mark settled after fitBounds idle fires — ignore idle events until then
          google.maps.event.addListenerOnce(this.googleMap.googleMap, 'idle', () => {
            this._mapSettled = true;
          });
        } else {
          // No URL bounds — let the first idle trigger the search
          this._mapSettled = true;
        }
      });
    });

    // Read initial page from URL (1-based in URL → 0-based internally)
    const initialPage = Math.max(0, (+this.route.snapshot.queryParams['page'] || 1) - 1);

    // Debounce map idle → search + update URL
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
      return;
    }
    this.focusedBounds = { north: doc.north, south: doc.south, east: doc.east, west: doc.west };
  }

  onItemLeave(): void {
    this.focusedBounds = null;
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
    const current = this.googleMap.getZoom() ?? 7;
    this.googleMap.googleMap?.setZoom(current + 1);
  }

  zoomOut(): void {
    const current = this.googleMap.getZoom() ?? 7;
    this.googleMap.googleMap?.setZoom(current - 1);
  }

  ngOnDestroy(): void {
    this.boundsDebounce$.complete();
    this.subs.forEach(s => s.unsubscribe());
    this.mapSearchService.clear();
  }
}
