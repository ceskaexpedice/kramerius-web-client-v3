import {NgModule} from '@angular/core';
import {SavedListsPageComponent} from './saved-lists-page.component';
import {RouterModule, Routes} from '@angular/router';
import {ActionToolbarComponent} from '../../shared/components/action-toolbar/action-toolbar.component';
import {
  AdvancedSearchIndicatorComponent
} from '../search-results-page/components/advanced-search-indicator/advanced-search-indicator.component';
import {AsyncPipe, NgClass, NgForOf, NgIf} from '@angular/common';
import {FilterSidebarComponent} from '../search-results-page/components/filter-sidebar/filter-sidebar.component';
import {PaginatorComponent} from '../../shared/components/paginator/paginator.component';
import {PaginatorInfoComponent} from '../../shared/components/paginator-info/paginator-info.component';
import {RecordItemComponent} from '../../shared/components/record-item/record-item.component';
import {RecordItemListComponent} from '../../shared/components/record-item-list/record-item-list.component';
import {RecordTypeTabsComponent} from '../../shared/components/record-type-tabs/record-type-tabs.component';
import {ResultsSortComponent} from '../search-results-page/components/results-sort/results-sort.component';
import {SearchFiltersComponent} from '../search-results-page/components/search-filters/search-filters.component';
import {SelectedTagsComponent} from '../../shared/components/selected-tags/selected-tags.component';
import {ToggleButtonGroupComponent} from '../../shared/components/toggle-button-group/toggle-button-group.component';
import {TranslatePipe} from '@ngx-translate/core';
import {SavedListsFiltersComponent} from './components/saved-lists-filters/saved-lists-filters.component';
import {ToolbarHeaderComponent} from '../../shared/components/toolbar-header/toolbar-header.component';

const routes: Routes = [
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
    NgClass,
    ToolbarHeaderComponent,
  ],
})

export class SavedListsPageModule {}
