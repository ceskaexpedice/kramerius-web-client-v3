import { PanelToggleButtonComponent } from '../../shared/components/panel-toggle-button/panel-toggle-button.component';
import { PanelResizeHandleComponent } from '../../shared/components/panel-resize-handle/panel-resize-handle.component';
import { METADATA_PANEL_ID } from '../../shared/components/detail-layout/metadata-panel-id';
import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { FixedPanelComponent } from '../../shared/components/fixed-panel/fixed-panel.component';
import { CommonModule } from '@angular/common';
import {Router} from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { RecordItemComponent } from '../../shared/components/record-item/record-item.component';
import { RecordItem } from '../../shared/components/record-item/record-item.model';
import { monographVolumeToRecordItem } from './monograph-volume-record-item';
import * as MonographVolumesSelectors from '../../shared/state/monograph-volumes/monograph-volumes.selectors';
import { MetadataSidebarComponent } from '../../shared/components/metadata-sidebar/metadata-sidebar.component';
import { MetadataSection } from '../../shared/components/metadata-section/metadata-section';
import { FilterSidebarComponent } from '../search-results-page/components/filter-sidebar/filter-sidebar.component';
import { MonographFiltersComponent } from './components/monograph-filters/monograph-filters.component';
import { MonographVolumesService } from '../../shared/services/monograph-volumes.service';
import { FILTER_SERVICE } from '../../shared/services/filter.service';
import {ActionToolbarComponent} from "../../shared/components/action-toolbar/action-toolbar.component";
import {ToolbarHeaderComponent} from "../../shared/components/toolbar-header/toolbar-header.component";
import {ToolbarControlsComponent} from '../../shared/components/toolbar-controls/toolbar-controls.component';
import {AdminSelectionCountComponent} from '../../shared/components/admin-selection-count/admin-selection-count.component';
import {AdminModeService} from '../../shared/services';
import {RecordHandlerService} from '../../shared/services/record-handler.service';
import {FavoritesPopupHelper} from '../../shared/helpers/favorites-popup.helper';
import {FavoritesService} from '../../shared/services/favorites.service';
import {PopupPositioningService} from '../../shared/services/popup-positioning.service';
import {UiStateService} from '../../shared/services/ui-state.service';
import { BreakpointService } from '../../shared/services/breakpoint.service';
import { ScrollHideHeaderDirective } from '../../shared/directives/scroll-hide-header.directive';
import {PaginatorComponent} from '../../shared/components/paginator/paginator.component';
import {NoResultsComponent} from '../../shared/components/no-results/no-results.component';
import {ResultsSortComponent} from '../search-results-page/components/results-sort/results-sort.component';
import {SkeletonListPipe} from '../../shared/pipes/skeleton-list.pipe';
import {SolrSortDirections, SolrSortFields} from '../../core/solr/solr-helpers';
import {SearchDocument} from '../models/search-document';

@Component({
  selector: 'app-monograph-volumes-page',
  standalone: true,
  imports: [
    CommonModule,
    PanelToggleButtonComponent,
    PanelResizeHandleComponent,
    RecordItemComponent,
    TranslatePipe,
    MetadataSidebarComponent,
    MetadataSection,
    FilterSidebarComponent,
    MonographFiltersComponent,
    ActionToolbarComponent,
    ToolbarHeaderComponent,
    ToolbarControlsComponent,
    AdminSelectionCountComponent,
    PaginatorComponent,
    ResultsSortComponent,
    SkeletonListPipe,
    NoResultsComponent,
    ScrollHideHeaderDirective,
    FixedPanelComponent,
  ],
  providers: [
    MonographVolumesService,
    { provide: FILTER_SERVICE, useExisting: MonographVolumesService }
  ],
  templateUrl: './monograph-volumes-page.component.html',
  styleUrl: './monograph-volumes-page.component.scss'
})
export class MonographVolumesPageComponent implements OnInit {
  public favoritesHelper: FavoritesPopupHelper;

  private store = inject(Store);
  adminModeService = inject(AdminModeService);
  recordHandler = inject(RecordHandlerService);
  private uiStateService = inject(UiStateService);
  public breakpointService = inject(BreakpointService);
  readonly metadataPanelId = METADATA_PANEL_ID;
  public monographVolumesService = inject(MonographVolumesService);

  // Signals from store
  parent = toSignal(this.store.select(MonographVolumesSelectors.selectMonographVolumesParent));
  volumes = toSignal(this.store.select(MonographVolumesSelectors.selectMonographVolumes));
  loading = toSignal(this.store.select(MonographVolumesSelectors.selectMonographVolumesLoading));
  error = toSignal(this.store.select(MonographVolumesSelectors.selectMonographVolumesError));

  // Sidebar state
  public showMetadataSidebar = this.uiStateService.metadataSidebarOpen;
  sidebarPositionMode: 'absolute' | 'relative' = 'relative';

  // Computed values
  volumeItems = computed<RecordItem[]>(() => {
    const vols = this.volumes() || [];
    return vols.map(vol => monographVolumeToRecordItem(vol));
  });

  constructor(
    favoritesService: FavoritesService,
    popupPositioning: PopupPositioningService,
    router: Router
  ) {
    this.favoritesHelper = new FavoritesPopupHelper(favoritesService, popupPositioning, router);
  }

  ngOnInit(): void {
  }

  /** Phones: the description opens as a slide-up sheet (no floating panel there). */
  mobileInfoOpen = signal(false);

  openRecordInfo() {
    if (this.breakpointService.isMobile()) {
      this.mobileInfoOpen.set(true);
      return;
    }
    this.toggleMetadataSidebar();
  }

  toggleMetadataSidebar() {
    this.uiStateService.toggleMetadataSidebar();
  }

  onFavoritesClicked(event: Event) {
    this.favoritesHelper.onFavoritesClicked(event, this.parent() || null, true);
  }

  onSortChange(event: { value: SolrSortFields; direction: SolrSortDirections }) {
    this.monographVolumesService.changeSortBy(event.value, event.direction);
  }

  // Convert a search result to a RecordItem with badge layout consideration,
  // like the periodical search results view — result cards carry the fulltext
  // snippet and page badge.
  toSearchRecordItem(doc: SearchDocument, allDocs: SearchDocument[]): RecordItem {
    return this.recordHandler.searchDocumentToRecordItemWithBadgeLayout(doc, allDocs);
  }

}
