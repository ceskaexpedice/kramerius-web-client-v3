import { NgModule } from '@angular/core';
import { DetailViewPageComponent } from './detail-view-page.component';
import { RouterModule, Routes } from '@angular/router';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { documentDetailReducer } from '../../shared/state/document-detail/document-detail.reducer';
import { DocumentDetailEffects } from '../../shared/state/document-detail/document-detail.effects';
import { AsyncPipe, JsonPipe, NgIf } from '@angular/common';
import {ActionToolbarComponent} from '../../shared/components/action-toolbar/action-toolbar.component';
import {FilterSidebarComponent} from '../search-results-page/components/filter-sidebar/filter-sidebar.component';
import {PeriodicalFiltersComponent} from '../periodical/components/periodical-filters/periodical-filters.component';
import {
	PeriodicalYearIssuesCalendarComponent
} from '../periodical/components/periodical-year-issues-calendar/periodical-year-issues-calendar.component';
import {
	PeriodicalYearIssuesGridComponent
} from '../periodical/components/periodical-year-issues-grid/periodical-year-issues-grid.component';
import {
	PeriodicalYearsGridComponent
} from '../periodical/components/periodical-years-grid/periodical-years-grid.component';
import {
	PeriodicalYearsTimelineComponent
} from '../periodical/components/periodical-years-timeline/periodical-years-timeline.component';
import {ToolbarControlsComponent} from '../../shared/components/toolbar-controls/toolbar-controls.component';
import {ToolbarHeaderComponent} from '../../shared/components/toolbar-header/toolbar-header.component';
import {YearNavigatorComponent} from '../../shared/components/year-navigator/year-navigator.component';
import {DetailPagesGridComponent} from './components/detail-pages-grid/detail-pages-grid.component';
import {InputComponent} from '../../shared/components/input/input.component';
import {
  DetailViewBottomToolbarComponent
} from './components/detail-view-bottom-toolbar/detail-view-bottom-toolbar.component';

const routes: Routes = [
  {
    path: ':uuid', component: DetailViewPageComponent
  }
]

@NgModule({
  declarations: [
    DetailViewPageComponent
  ],
  imports: [
    RouterModule.forChild(routes),
    StoreModule.forFeature('document-detail', documentDetailReducer),
    EffectsModule.forFeature([DocumentDetailEffects]),
    NgIf,
    AsyncPipe,
    JsonPipe,
    ActionToolbarComponent,
    FilterSidebarComponent,
    ToolbarControlsComponent,
    ToolbarHeaderComponent,
    YearNavigatorComponent,
    DetailPagesGridComponent,
    InputComponent,
    DetailViewBottomToolbarComponent,
  ],
})

export class DetailViewPageModule { }
