import {RouterModule, Routes} from '@angular/router';
import {SearchResultsPageComponent} from './search-results-page.component';
import {NgModule} from '@angular/core';
import {FilterSidebarComponent} from './components/filter-sidebar/filter-sidebar.component';
import {StoreModule} from '@ngrx/store';
import {periodicalsReducer} from '../../state/search/periodicals/periodicals.reducer';
import {booksReducer} from '../../state/search/books/books.reducer';
import {genresReducer} from '../../state/search/genres/genres.reducer';
import {documentTypesReducer} from '../../state/search/document-types/document-types.reducer';
import {EffectsModule} from '@ngrx/effects';
import {PeriodicalsEffects} from '../../state/search/periodicals/periodicals.effects';
import {BooksEffects} from '../../state/search/books/books.effects';
import {GenresEffects} from '../../state/search/genres/genres.effects';
import {DocumentTypesEffects} from '../../state/search/document-types/document-types.effects';
import {SearchEffects} from '../../state/search/search.effects';
import {AsyncPipe, NgForOf, NgIf} from '@angular/common';
import {RecordItemComponent} from '../../shared/components/record-item/record-item.component';
import {searchReducer} from '../../state/search/search.reducer';
import {SelectedTagsComponent} from '../../shared/components/selected-tags/selected-tags.component';
import {PaginatorComponent} from '../../shared/components/paginator/paginator.component';
import {PaginatorInfoComponent} from '../../shared/components/paginator-info/paginator-info.component';

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
    EffectsModule.forFeature([PeriodicalsEffects, BooksEffects, GenresEffects, DocumentTypesEffects, SearchEffects]),
    NgIf,
    AsyncPipe,
    NgForOf,
    RecordItemComponent,
    SelectedTagsComponent,
    PaginatorComponent,
    PaginatorInfoComponent,
  ],
})

export class SearchResultsPageModule {
}
