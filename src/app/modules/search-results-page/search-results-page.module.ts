import { RouterModule, Routes } from '@angular/router';
import { SearchResultsPageComponent } from './search-results-page.component';
import { NgModule } from '@angular/core';
import { FilterSidebarComponent } from './components/filter-sidebar/filter-sidebar.component';
import { AsyncPipe, NgIf } from '@angular/common';
import { PaginatorInfoComponent } from '../../shared/components/paginator-info/paginator-info.component';
import { ResultsSortComponent } from './components/results-sort/results-sort.component';
import { SearchFiltersComponent } from './components/search-filters/search-filters.component';
import { SearchService } from '../../shared/services/search.service';
import { ActionToolbarComponent } from '../../shared/components/action-toolbar/action-toolbar.component';
import { TranslatePipe } from '@ngx-translate/core';
import { ToggleButtonGroupComponent } from '../../shared/components/toggle-button-group/toggle-button-group.component';
import { AdminActionsComponent } from '../../shared/components/admin-actions/admin-actions.component';
import { ToolbarControlsComponent } from '../../shared/components/toolbar-controls/toolbar-controls.component';
import { MapBrowseComponent } from './components/map-browse/map-browse.component';
import { SearchResultsViewComponent } from './components/search-results-view/search-results-view.component';
import { MobileNavBarComponent } from '../../shared/components/mobile-nav-bar/mobile-nav-bar.component';

const routes: Routes = [
	{
		path: '',
		component: SearchResultsPageComponent,
	},
];

@NgModule({
	declarations: [SearchResultsPageComponent],
	imports: [
		RouterModule.forChild(routes),
		FilterSidebarComponent,
		NgIf,
		AsyncPipe,
		PaginatorInfoComponent,
		ResultsSortComponent,
		SearchFiltersComponent,
		ActionToolbarComponent,
		TranslatePipe,
		ToggleButtonGroupComponent,
		AdminActionsComponent,
		ToolbarControlsComponent,
		MapBrowseComponent,
		SearchResultsViewComponent,
		MobileNavBarComponent,
	],
	providers: [
		{ provide: 'FilterService', useExisting: SearchService },
	]
})

export class SearchResultsPageModule {
}
