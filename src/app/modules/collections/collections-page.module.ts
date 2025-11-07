import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {CollectionsPage} from './collections-page';
import {FilterSidebarComponent} from '../search-results-page/components/filter-sidebar/filter-sidebar.component';
import {ActionToolbarComponent} from '../../shared/components/action-toolbar/action-toolbar.component';
import {CollectionsService} from '../../shared/services/collections.service';
import {FILTER_SERVICE} from '../../shared/services/filter.service';
import {AsyncPipe, NgForOf} from '@angular/common';
import {RecordItemComponent} from '../../shared/components/record-item/record-item.component';

const routes: Routes = [
  {
    path: ':uuid', component: CollectionsPage
  }
]

@NgModule({
  declarations: [CollectionsPage],
  imports: [
    RouterModule.forChild(routes),
    FilterSidebarComponent,
    ActionToolbarComponent,
    NgForOf,
    RecordItemComponent,
    AsyncPipe,
  ],
  providers: [
    CollectionsService,
    {provide: FILTER_SERVICE, useValue: CollectionsService},
  ]
})

export class CollectionsPageModule { }
