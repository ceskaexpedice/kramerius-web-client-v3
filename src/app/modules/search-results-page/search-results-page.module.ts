import {RouterModule, Routes} from '@angular/router';
import {SearchResultsPageComponent} from './search-results-page.component';
import {NgModule} from '@angular/core';
import {FilterSidebarComponent} from './components/filter-sidebar/filter-sidebar.component';
import {StoreModule} from '@ngrx/store';
import {periodicalsReducer} from '../search/state/periodicals/periodicals.reducer';
import {booksReducer} from '../search/state/books/books.reducer';
import {genresReducer} from '../search/state/genres/genres.reducer';
import {documentTypesReducer} from '../search/state/document-types/document-types.reducer';
import {EffectsModule} from '@ngrx/effects';
import {PeriodicalsEffects} from '../search/state/periodicals/periodicals.effects';
import {BooksEffects} from '../search/state/books/books.effects';
import {GenresEffects} from '../search/state/genres/genres.effects';
import {DocumentTypesEffects} from '../search/state/document-types/document-types.effects';
import {SearchEffects} from './state/search.effects';
import {AsyncPipe, NgClass, NgForOf, NgIf, UpperCasePipe} from '@angular/common';
import {RecordItemComponent} from '../../shared/components/record-item/record-item.component';
import {searchReducer} from './state/search.reducer';
import {SelectedTagsComponent} from '../../shared/components/selected-tags/selected-tags.component';
import {PaginatorComponent} from '../../shared/components/paginator/paginator.component';
import {PaginatorInfoComponent} from '../../shared/components/paginator-info/paginator-info.component';
import {ResultsSortComponent} from './components/results-sort/results-sort.component';
import {SearchFiltersComponent} from './components/search-filters/search-filters.component';
import {SearchService} from '../../shared/services/search.service';
import {ActionToolbarComponent} from '../../shared/components/action-toolbar/action-toolbar.component';
import {RecordTypeTabsComponent} from '../../shared/components/record-type-tabs/record-type-tabs.component';
import {TranslatePipe} from '@ngx-translate/core';
import {
  AdvancedSearchIndicatorComponent
} from './components/advanced-search-indicator/advanced-search-indicator.component';
import {ToggleButtonGroupComponent} from '../../shared/components/toggle-button-group/toggle-button-group.component';
import {RecordItemListComponent} from '../../shared/components/record-item-list/record-item-list.component';
import {musicDetailReducer} from '../music/state/music-detail.reducer';

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
    StoreModule.forFeature('periodicals', periodicalsReducer),
    StoreModule.forFeature('books', booksReducer),
    StoreModule.forFeature('genres', genresReducer),
    StoreModule.forFeature('document-types', documentTypesReducer),
    StoreModule.forFeature('search-results', searchReducer),
    StoreModule.forFeature('music', musicDetailReducer),
    EffectsModule.forFeature([PeriodicalsEffects, BooksEffects, GenresEffects, DocumentTypesEffects, SearchEffects]),
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
  ],
  providers: [
    { provide: 'FilterService', useClass: SearchService }
  ]
})

export class SearchResultsPageModule {
}
