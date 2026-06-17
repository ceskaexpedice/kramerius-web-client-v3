import { NgModule } from '@angular/core';
import { RecordExportPanelComponent } from '../../shared/components/record-export-panel/record-export-panel.component';
import { SavedListsPageComponent } from './saved-lists-page.component';
import { RouterModule, Routes } from '@angular/router';
import { ActionToolbarComponent } from '../../shared/components/action-toolbar/action-toolbar.component';
import {
  AdvancedSearchIndicatorComponent
} from '../search-results-page/components/advanced-search-indicator/advanced-search-indicator.component';
import { AsyncPipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { FilterSidebarComponent } from '../search-results-page/components/filter-sidebar/filter-sidebar.component';
import { PaginatorComponent } from '../../shared/components/paginator/paginator.component';
import { PaginatorInfoComponent } from '../../shared/components/paginator-info/paginator-info.component';
import { RecordItemComponent } from '../../shared/components/record-item/record-item.component';
import { RecordItemListComponent } from '../../shared/components/record-item-list/record-item-list.component';
import { RecordTypeTabsComponent } from '../../shared/components/record-type-tabs/record-type-tabs.component';
import { ResultsSortComponent } from '../search-results-page/components/results-sort/results-sort.component';
import { SearchFiltersComponent } from '../search-results-page/components/search-filters/search-filters.component';
import { SelectedTagsComponent } from '../../shared/components/selected-tags/selected-tags.component';
import { ToggleButtonGroupComponent } from '../../shared/components/toggle-button-group/toggle-button-group.component';
import { TranslatePipe } from '@ngx-translate/core';
import { SavedListsFiltersComponent } from './components/saved-lists-filters/saved-lists-filters.component';
import { SavedListsFacetFiltersComponent } from './components/saved-lists-facet-filters/saved-lists-facet-filters.component';
import { FILTER_SERVICE } from '../../shared/services/filter.service';
import { SavedListsFilterService } from './services/saved-lists-filter.service';
import { ToolbarHeaderComponent } from '../../shared/components/toolbar-header/toolbar-header.component';
import { InputComponent } from '../../shared/components/input/input.component';
import { ToolbarControlsComponent } from '../../shared/components/toolbar-controls/toolbar-controls.component';
import { MusicTrackListComponent } from '../music/components/music-track-list/music-track-list.component';
import { TitleEditPopupComponent } from '../../shared/components/title-edit-popup/title-edit-popup.component';
import { InlineLoaderComponent } from '../../shared/components/inline-loader/inline-loader.component';
import { SkeletonListPipe } from '../../shared/pipes/skeleton-list.pipe';
import { InfoBannerComponent } from '../../shared/components/info-banner/info-banner.component';
import { CdkTooltipDirective } from '../../shared/directives/cdk-tooltip/cdk-tooltip.directive';

const routes: Routes = [
  {
    path: '',
    component: SavedListsPageComponent
  },
  {
    path: ':uuid',
    component: SavedListsPageComponent
  }
];

@NgModule({
  declarations: [
    SavedListsPageComponent
  ],
  imports: [
    RouterModule.forChild(routes),
    ActionToolbarComponent,
    AdvancedSearchIndicatorComponent,
    AsyncPipe,
    FilterSidebarComponent,
    NgForOf,
    NgIf,
    PaginatorComponent,
    PaginatorInfoComponent,
    RecordItemComponent,
    RecordItemListComponent,
    RecordTypeTabsComponent,
    ResultsSortComponent,
    SearchFiltersComponent,
    SelectedTagsComponent,
    ToggleButtonGroupComponent,
    TranslatePipe,
    SavedListsFiltersComponent,
    SavedListsFacetFiltersComponent,
    NgClass,
    ToolbarHeaderComponent,
    InputComponent,
    ToolbarControlsComponent,
    MusicTrackListComponent,
    TitleEditPopupComponent,
    InlineLoaderComponent,
    SkeletonListPipe,
    RecordExportPanelComponent,
    InfoBannerComponent,
    CdkTooltipDirective,
  ],
  providers: [
    { provide: FILTER_SERVICE, useExisting: SavedListsFilterService },
  ],
})

export class SavedListsPageModule { }
