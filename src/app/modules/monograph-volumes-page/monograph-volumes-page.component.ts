import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { RecordItemComponent } from '../../shared/components/record-item/record-item.component';
import { RecordItem, searchDocumentToRecordItem } from '../../shared/components/record-item/record-item.model';
import * as MonographVolumesActions from '../../shared/state/monograph-volumes/monograph-volumes.actions';
import * as MonographVolumesSelectors from '../../shared/state/monograph-volumes/monograph-volumes.selectors';
import { MonographRightSidebarContent } from './components/monograph-right-sidebar-content/monograph-right-sidebar-content';
import { FilterSidebarComponent } from '../search-results-page/components/filter-sidebar/filter-sidebar.component';
import {ActionToolbarComponent} from "../../shared/components/action-toolbar/action-toolbar.component";
import {AdminActionsComponent} from "../../shared/components/admin-actions";
import {ResultsSortComponent} from "../search-results-page/components/results-sort/results-sort.component";
import {ToolbarControlsComponent} from "../../shared/components/toolbar-controls/toolbar-controls.component";
import {ToolbarHeaderComponent} from "../../shared/components/toolbar-header/toolbar-header.component";

@Component({
  selector: 'app-monograph-volumes-page',
  standalone: true,
  imports: [
    CommonModule,
    RecordItemComponent,
    TranslatePipe,
    MonographRightSidebarContent,
    FilterSidebarComponent,
    ActionToolbarComponent,
    AdminActionsComponent,
    ResultsSortComponent,
    ToolbarControlsComponent,
    ToolbarHeaderComponent,
  ],
  templateUrl: './monograph-volumes-page.component.html',
  styleUrl: './monograph-volumes-page.component.scss'
})
export class MonographVolumesPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private store = inject(Store);

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

  ngOnInit(): void {
    // Get uuid from route params and load data
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.store.dispatch(MonographVolumesActions.loadMonographVolumes({ uuid }));
    }
  }

  showRightSidebar() {
    this.rightSidebarVisible.set(true);
  }

  hideRightSidebar() {
    this.rightSidebarVisible.set(false);
  }
}
