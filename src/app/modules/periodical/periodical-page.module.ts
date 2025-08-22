import {NgModule} from '@angular/core';
import {PeriodicalPageComponent} from './periodical-page.component';
import {RouterModule, Routes} from '@angular/router';
import {AsyncPipe, JsonPipe, NgForOf, NgIf} from '@angular/common';
import {FilterSidebarComponent} from '../search-results-page/components/filter-sidebar/filter-sidebar.component';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatNativeDateModule} from '@angular/material/core';
import {
  PeriodicalYearsTimelineComponent
} from './components/periodical-years-timeline/periodical-years-timeline.component';
import {PeriodicalYearsGridComponent} from './components/periodical-years-grid/periodical-years-grid.component';
import {
  PeriodicalYearIssuesCalendarComponent
} from './components/periodical-year-issues-calendar/periodical-year-issues-calendar.component';
import {
  PeriodicalYearIssuesGridComponent
} from './components/periodical-year-issues-grid/periodical-year-issues-grid.component';
import {PeriodicalFilterService} from './services/periodical-filter.service';
import {PeriodicalFiltersComponent} from './components/periodical-filters/periodical-filters.component';
import {ActionToolbarComponent} from '../../shared/components/action-toolbar/action-toolbar.component';
import {RecordTypeTabsComponent} from '../../shared/components/record-type-tabs/record-type-tabs.component';
import {ToolbarHeaderComponent} from '../../shared/components/toolbar-header/toolbar-header.component';
import {ToolbarControlsComponent} from '../../shared/components/toolbar-controls/toolbar-controls.component';
import {ResultsSortComponent} from '../search-results-page/components/results-sort/results-sort.component';
import {DateNavigatorComponent} from '../../shared/components/date-navigator/date-navigator.component';
import {FILTER_SERVICE} from '../../shared/services/filter.service';
import {PeriodicalService} from '../../shared/services/periodical.service';
import {
  PeriodicalSearchResultsComponent
} from './components/periodical-search-results/periodical-search-results.component';
import {SelectedTagsComponent} from '../../shared/components/selected-tags/selected-tags.component';

const routes: Routes = [
  {
    path: ':uuid', component: PeriodicalPageComponent
  }
]

@NgModule({
  declarations: [
    PeriodicalPageComponent
  ],
  imports: [
    RouterModule.forChild(routes),
    AsyncPipe,
    JsonPipe,
    NgIf,
    NgForOf,
    FilterSidebarComponent,
    MatDatepickerModule,
    MatNativeDateModule,
    PeriodicalYearsTimelineComponent,
    PeriodicalYearsGridComponent,
    PeriodicalYearIssuesCalendarComponent,
    PeriodicalYearIssuesGridComponent,
    PeriodicalFiltersComponent,
    ActionToolbarComponent,
    RecordTypeTabsComponent,
    ToolbarHeaderComponent,
    ToolbarControlsComponent,
    ResultsSortComponent,
    DateNavigatorComponent,
    PeriodicalSearchResultsComponent,
    SelectedTagsComponent,
  ],
  providers: [
    PeriodicalService,
    { provide: FILTER_SERVICE, useExisting: PeriodicalService }
  ]

})

export class PeriodicalPageModule {}
