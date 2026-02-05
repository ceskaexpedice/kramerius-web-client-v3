import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {Router} from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { RecordItemComponent } from '../../shared/components/record-item/record-item.component';
import { RecordItem, searchDocumentToRecordItem } from '../../shared/components/record-item/record-item.model';
import * as MonographVolumesSelectors from '../../shared/state/monograph-volumes/monograph-volumes.selectors';
import { MonographRightSidebarContent } from './components/monograph-right-sidebar-content/monograph-right-sidebar-content';
import { FilterSidebarComponent } from '../search-results-page/components/filter-sidebar/filter-sidebar.component';
import { MonographFiltersComponent } from './components/monograph-filters/monograph-filters.component';
import { MonographVolumesService } from '../../shared/services/monograph-volumes.service';
import { FILTER_SERVICE } from '../../shared/services/filter.service';
import {ActionToolbarComponent} from "../../shared/components/action-toolbar/action-toolbar.component";
import {ToolbarHeaderComponent} from "../../shared/components/toolbar-header/toolbar-header.component";
import {ToolbarControlsComponent} from '../../shared/components/toolbar-controls/toolbar-controls.component';
import {SelectionService} from '../../shared/services';
import {RecordHandlerService} from '../../shared/services/record-handler.service';
import {FavoritesPopupHelper} from '../../shared/helpers/favorites-popup.helper';
import {FavoritesService} from '../../shared/services/favorites.service';
import {PopupPositioningService} from '../../shared/services/popup-positioning.service';
import {UiStateService} from '../../shared/services/ui-state.service';

@Component({
  selector: 'app-monograph-volumes-page',
  standalone: true,
  imports: [
    CommonModule,
    RecordItemComponent,
    TranslatePipe,
    MonographRightSidebarContent,
    FilterSidebarComponent,
    MonographFiltersComponent,
    ActionToolbarComponent,
    ToolbarHeaderComponent,
    ToolbarControlsComponent,
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
  selectionService = inject(SelectionService);
  recordHandler = inject(RecordHandlerService);
  private uiStateService = inject(UiStateService);

  // Signals from store
  parent = toSignal(this.store.select(MonographVolumesSelectors.selectMonographVolumesParent));
  volumes = toSignal(this.store.select(MonographVolumesSelectors.selectMonographVolumes));
  loading = toSignal(this.store.select(MonographVolumesSelectors.selectMonographVolumesLoading));
  error = toSignal(this.store.select(MonographVolumesSelectors.selectMonographVolumesError));

  // Sidebar state
  rightSidebarVisible = signal(true);
  sidebarPositionMode: 'absolute' | 'relative' = 'absolute';

  // Computed values
  volumeItems = computed<RecordItem[]>(() => {
    const vols = this.volumes() || [];
    return vols.map(vol => searchDocumentToRecordItem(vol));
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

  showRightSidebar() {
    this.rightSidebarVisible.set(true);
  }

  hideRightSidebar() {
    this.rightSidebarVisible.set(false);
  }

  openRecordInfo() {
    this.toggleMetadataSidebar();
  }

  toggleMetadataSidebar() {
    this.uiStateService.toggleMetadataSidebar();
  }

  onFavoritesClicked(event: Event) {
    this.favoritesHelper.onFavoritesClicked(event, this.parent() || null, true);
  }

}
