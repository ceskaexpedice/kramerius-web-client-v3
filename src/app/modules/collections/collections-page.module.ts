import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {CollectionsPage} from './collections-page';
import {FilterSidebarComponent} from '../search-results-page/components/filter-sidebar/filter-sidebar.component';
import {ActionToolbarComponent} from '../../shared/components/action-toolbar/action-toolbar.component';
import {CollectionsService} from '../../shared/services/collections.service';
import {FILTER_SERVICE} from '../../shared/services/filter.service';
import {AsyncPipe, JsonPipe, NgForOf, NgIf} from '@angular/common';
import {RecordItemComponent} from '../../shared/components/record-item/record-item.component';
import {AdminActionsComponent} from '../../shared/components/admin-actions';
import {ToolbarHeaderComponent} from '../../shared/components/toolbar-header/toolbar-header.component';
import {BreadcrumbsComponent} from '../../shared/components/breadcrumbs/breadcrumbs.component';
import {TranslateModule} from '@ngx-translate/core';
import {CollectionFiltersComponent} from './components/collection-filters/collection-filters.component';
import {SelectedTagsComponent} from '../../shared/components/selected-tags/selected-tags.component';
import {EffectsModule} from '@ngrx/effects';
import {CollectionsEffects} from '../../shared/state/collections/collections.effects';

const routes: Routes = [
  {
    path: ':uuid', component: CollectionsPage
  }
]

@NgModule({
  declarations: [CollectionsPage, BreadcrumbsComponent],
  imports: [
    RouterModule.forChild(routes),
    FilterSidebarComponent,
    ActionToolbarComponent,
    NgForOf,
    RecordItemComponent,
    AsyncPipe,
    JsonPipe,
    AdminActionsComponent,
    NgIf,
    ToolbarHeaderComponent,
    TranslateModule,
    CollectionFiltersComponent,
    SelectedTagsComponent,
    EffectsModule.forFeature([CollectionsEffects])
  ],
  providers: [
    CollectionsService,
    {provide: FILTER_SERVICE, useExisting: CollectionsService},
  ]
})

export class CollectionsPageModule { }
