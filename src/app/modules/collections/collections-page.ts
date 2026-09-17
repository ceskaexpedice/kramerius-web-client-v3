import { Component, inject, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy, signal } from '@angular/core';
import { InlineLoaderComponent } from '../../shared/components/inline-loader/inline-loader.component';
import { AdminModeService } from '../../shared/services';
import { CollectionsService } from '../../shared/services/collections.service';
import { SearchDocument } from '../models/search-document';
import { RecordItem, searchDocumentToRecordItem } from '../../shared/components/record-item/record-item.model';
import { Cutting, cuttingToRecordItem } from '../../shared/models/cutting.model';
import { ToggleOption } from '../../shared/components/toggle-button-group/toggle-button-group.component';
import { AppTranslationService } from '../../shared/translation/app-translation.service';
import { Metadata } from '../../shared/models/metadata.model';
import { RecordHandlerService } from '../../shared/services/record-handler.service';
import { SolrSortDirections, SolrSortFields } from '../../core/solr/solr-helpers';
import { Subject, takeUntil } from 'rxjs';
import { UiStateService } from '../../shared/services/ui-state.service';
import { getLanguageFallbackChain } from '../../shared/translation/translation-fallback-chain';
import { resolveLocalizedValue } from '../../shared/utils/language-utils';
import { ActivatedRoute, Router } from '@angular/router';
import { MapSeriesService } from '../map-series/map-series.service';
import { APP_ROUTES_ENUM } from '../../app.routes';
import { MobileNavItem } from '../../shared/components/mobile-nav-bar/mobile-nav-bar.component';
import { BreakpointService } from '../../shared/services/breakpoint.service';

@Component({
  selector: 'app-collections-page',
  templateUrl: './collections-page.html',
  styleUrl: './collections-page.scss',
  standalone: false
})
export class CollectionsPage implements OnInit, AfterViewInit, OnDestroy {

  public adminModeService = inject(AdminModeService);
  public collectionsService = inject(CollectionsService);
  public translationService = inject(AppTranslationService);
  public recordHandler = inject(RecordHandlerService);
  private uiStateService = inject(UiStateService);
  private mapSeriesService = inject(MapSeriesService);
  public breakpointService = inject(BreakpointService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  @ViewChild('descriptionElement') descriptionElement?: ElementRef<HTMLElement>;

  isDescriptionExpanded = false;
  isDescriptionTruncated = false;
  rightSidebarVisible = this.uiStateService.metadataSidebarOpen;
  sidebarPositionMode: 'absolute' | 'relative' = 'relative'; // 'absolute' = over content, 'relative' = beside content

  private destroy$ = new Subject<void>();

  ngOnInit() {
    // Check for truncation when detail data loads
    this.collectionsService.detail$
      .pipe(takeUntil(this.destroy$))
      .subscribe(detail => {
        if (detail) {
          // Wait for DOM to update with new content
          setTimeout(() => {
            if (this.descriptionElement) {
              this.checkIfTruncated(this.descriptionElement.nativeElement);
            }
          }, 100);
        }
      });
  }

  ngAfterViewInit() {
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  checkIfTruncated(element: HTMLElement) {
    // Get clamped height
    const clampedHeight = element.clientHeight;

    // Add a class to temporarily remove line-clamp
    element.classList.add('check-height');

    // Force reflow to apply the class
    element.offsetHeight;

    // Measure full height
    const fullHeight = element.scrollHeight;

    // Remove temporary class
    element.classList.remove('check-height');

    this.isDescriptionTruncated = fullHeight > clampedHeight;
  }

  toggleDescription() {
    this.isDescriptionExpanded = !this.isDescriptionExpanded;
  }

  toRecordItem(doc: SearchDocument): RecordItem {
    return searchDocumentToRecordItem(doc);
  }

  toCuttingRecordItem(cutting: Cutting): RecordItem {
    return cuttingToRecordItem(cutting);
  }

  /**
   * True when this collection is a map series, i.e. a grid overlay is
   * published for it — only those offer the sheet index view.
   */
  get isMapSeries(): boolean {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    return !!uuid && !!this.mapSeriesService.getShapefileUrl(uuid);
  }

  goToMapSeries(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.router.navigate([APP_ROUTES_ENUM.MAP_SERIES, uuid]);
    }
  }

  /**
   * The toolbar's tab strip is hidden on phones, so map series offer the same
   * switch in the bottom nav bar — matching the sheet index view.
   */
  readonly mobileNavItems: MobileNavItem[] = [
    { id: 'documents', label: 'map-series--view-documents', icon: 'icon-grid-6' },
    { id: 'map', label: 'map-series--view-map', icon: 'icon-map' }
  ];

  /**
   * Bottom offset for the floating filter toggle when the map-series nav bar is
   * on screen: its 61px height plus a gap. The sidebar takes the larger of this
   * and its own 72px mobile default, so anything below that has no effect.
   */
  private static readonly NAV_BAR_TOGGLE_OFFSET = 85;

  filterToggleBottomOffset(): number {
    return this.isMapSeries && this.breakpointService.isMobile()
      ? CollectionsPage.NAV_BAR_TOGGLE_OFFSET
      : 0;
  }

  onMobileNavChange(id: string): void {
    if (id === 'map') {
      this.goToMapSeries();
    }
  }

  viewModeOptions: ToggleOption<'documents' | 'cuttings'>[] = [
    { value: 'documents', label: 'collection--view-documents' },
    { value: 'cuttings', label: 'collection--view-cuttings' },
  ];

  setViewMode(mode: 'documents' | 'cuttings') {
    this.collectionsService.viewMode.set(mode);
  }

  /**
   * Gets the collection description in the current language
   */
  getLocalizedDescription(metadata: Metadata): string {
    if (!metadata || !metadata.notes || metadata.notes.length === 0) return '';

    const currentLang = this.translationService.currentLanguage().code;

    // Prefer the current UI language, then walk the configured fallback chain,
    // and finally the first available note when none of those languages are present.
    for (const lang of getLanguageFallbackChain(currentLang)) {
      const note = metadata.notes.find(n => n.lang === lang);
      if (note) {
        return note.text;
      }
    }

    return metadata.notes[0].text;
  }

  /**
   * Gets the collection title in the current language
   */
  getLocalizedTitle(metadata: Metadata): string {
    if (!metadata || !metadata.collectionTitles) return metadata?.mainTitle || '';

    const currentLang = this.translationService.currentLanguage().code;
    return resolveLocalizedValue(metadata.collectionTitles, currentLang) || metadata.mainTitle || '';
  }

  onExportSelected(): void {
  }

  onEditSelected(selectedIds: string[]): void {
  }

  onSortChange(event: { value: SolrSortFields; direction: SolrSortDirections }) {
    this.collectionsService.changeSortBy(event.value, event.direction);
  }

  showRightSidebar() {
    this.uiStateService.setMetadataSidebarState(true);
  }

  hideRightSidebar() {
    this.uiStateService.setMetadataSidebarState(false);
  }
}
