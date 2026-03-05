import { RouterModule, Routes } from '@angular/router';
import { SearchResultsPageComponent } from './search-results-page.component';
import { InlineLoaderComponent } from '../../shared/components/inline-loader/inline-loader.component';
import { NgModule } from '@angular/core';
import { FilterSidebarComponent } from './components/filter-sidebar/filter-sidebar.component';
import { AsyncPipe, NgClass, NgForOf, NgIf, UpperCasePipe } from '@angular/common';
import { RecordItemComponent } from '../../shared/components/record-item/record-item.component';
import { SelectedTagsComponent } from '../../shared/components/selected-tags/selected-tags.component';
import { PaginatorComponent } from '../../shared/components/paginator/paginator.component';
import { PaginatorInfoComponent } from '../../shared/components/paginator-info/paginator-info.component';
import { ResultsSortComponent } from './components/results-sort/results-sort.component';
import { SearchFiltersComponent } from './components/search-filters/search-filters.component';
import { SearchService } from '../../shared/services/search.service';
import { ActionToolbarComponent } from '../../shared/components/action-toolbar/action-toolbar.component';
import { RecordTypeTabsComponent } from '../../shared/components/record-type-tabs/record-type-tabs.component';
import { TranslatePipe } from '@ngx-translate/core';
import {
	AdvancedSearchIndicatorComponent
} from './components/advanced-search-indicator/advanced-search-indicator.component';
import { ToggleButtonGroupComponent } from '../../shared/components/toggle-button-group/toggle-button-group.component';
import { RecordItemListComponent } from '../../shared/components/record-item-list/record-item-list.component';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';
import { AdminActionsComponent } from '../../shared/components/admin-actions/admin-actions.component';
import { ToolbarControlsComponent } from '../../shared/components/toolbar-controls/toolbar-controls.component';
import { ScrollHideHeaderDirective } from '../../shared/directives/scroll-hide-header.directive';
import { SkeletonListPipe } from '../../shared/pipes/skeleton-list.pipe';
import { RecordExportPanelComponent } from '../../shared/components/record-export-panel/record-export-panel.component';

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
		NgForOf,
		RecordItemComponent,
		SelectedTagsComponent,
		PaginatorComponent,
		PaginatorInfoComponent,
		ResultsSortComponent,
		SearchFiltersComponent,
		ActionToolbarComponent,
		RecordTypeTabsComponent,
		TranslatePipe,
		UpperCasePipe,
		AdvancedSearchIndicatorComponent,
		ToggleButtonGroupComponent,
		NgClass,
		RecordItemListComponent,
		MatDatepickerModule,
		MatNativeDateModule,
		MatSlideToggle,
		FormsModule,
		AdminActionsComponent,
		ToolbarControlsComponent,
		InlineLoaderComponent,
		ScrollHideHeaderDirective,
		SkeletonListPipe,
		RecordExportPanelComponent,
	],
	providers: [
		{ provide: 'FilterService', useExisting: SearchService },
	]
})

export class SearchResultsPageModule {
}
