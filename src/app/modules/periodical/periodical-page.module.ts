import {NgModule} from '@angular/core';
import {PeriodicalPageComponent} from './periodical-page.component';
import {RouterModule, Routes} from '@angular/router';
import {StoreModule} from '@ngrx/store';
import {EffectsModule} from '@ngrx/effects';
import {periodicalDetailReducer} from './state/periodical-detail.reducer';
import {PeriodicalDetailEffects} from './state/periodical-detail.effects';
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

const routes: Routes = [
  {
    path: '', component: PeriodicalPageComponent
  }
]

@NgModule({
  declarations: [
    PeriodicalPageComponent
  ],
  imports: [
    RouterModule.forChild(routes),
    StoreModule.forFeature('periodical-detail', periodicalDetailReducer),
    EffectsModule.forFeature([PeriodicalDetailEffects]),
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
  ],
  providers: [
    { provide: 'FilterService', useClass: PeriodicalFilterService }
  ]

})

export class PeriodicalPageModule {}
