import {NgModule} from '@angular/core';
import {PeriodicalViewPageComponent} from './periodical-view-page.component';
import {RouterModule, Routes} from '@angular/router';
import {StoreModule} from '@ngrx/store';
import {EffectsModule} from '@ngrx/effects';
import {periodicalDetailReducer} from '../../state/periodical-detail/periodical-detail.reducer';
import {PeriodicalDetailEffects} from '../../state/periodical-detail/periodical-detail.effects';
import {AsyncPipe, JsonPipe, NgForOf, NgIf} from '@angular/common';
import {FilterSidebarComponent} from '../search-results-page/components/filter-sidebar/filter-sidebar.component';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatNativeDateModule} from '@angular/material/core';

const routes: Routes = [
  {
    path: '', component: PeriodicalViewPageComponent
  }
]

@NgModule({
  declarations: [
    PeriodicalViewPageComponent
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
    MatNativeDateModule
	],
})

export class PeriodicalViewPageModule {}
