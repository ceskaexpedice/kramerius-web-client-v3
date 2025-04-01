import {RouterModule, Routes} from '@angular/router';
import {SearchResultsPageComponent} from './search-results-page.component';
import {NgModule} from '@angular/core';
import {FilterSidebarComponent} from './components/filter-sidebar/filter-sidebar.component';

const routes: Routes = [
  {
    path: '',
    component: SearchResultsPageComponent,
  },
];

@NgModule({
  declarations: [SearchResultsPageComponent],
  imports: [RouterModule.forChild(routes), FilterSidebarComponent],
})

export class SearchResultsPageModule {
}
