import {NgModule} from '@angular/core';
import {SearchPageComponent} from './search-page.component';
import {RouterModule, Routes} from '@angular/router';
import {InstitutionsSectionComponent} from './components/institutions-section/institutions-section.component';
import {AuthorsSectionComponent} from './components/authors-section/authors-section.component';
import {BooksSectionComponent} from './components/books-section/books-section.component';
import {GenresSectionComponent} from './components/genres-section/genres-section.component';
import {PeriodicalsSectionComponent} from './components/periodicals-section/periodicals-section.component';
import {MapSectionComponent} from './components/map-section/map-section.component';
import {DocumentTypesSectionComponent} from './components/document-types-section/document-types-section.component';
import {ImagesSectionComponent} from './components/images-section/images-section.component';
import {HeaderComponent} from '../../core/layout/header/header.component';
import {SearchHeroComponent} from './components/search-hero/search-hero.component';
import {StoreModule} from '@ngrx/store';
import {periodicalsReducer} from '../../state/search/periodicals/periodicals.reducer';
import {EffectsModule} from '@ngrx/effects';
import {PeriodicalsEffects} from '../../state/search/periodicals/periodicals.effects';
import {BooksEffects} from '../../state/search/books/books.effects';
import {booksReducer} from '../../state/search/books/books.reducer';
import {GenresEffects} from '../../state/search/genres/genres.effects';
import {genresReducer} from '../../state/search/genres/genres.reducer';
import {DocumentTypesEffects} from '../../state/search/document-types/document-types.effects';
import {documentTypesReducer} from '../../state/search/document-types/document-types.reducer';
import {FooterComponent} from '../../core/layout/footer/footer.component';
import {SearchEffects} from '../../state/search/search.effects';
import {searchReducer} from '../../state/search/search.reducer';

const routes: Routes = [
  {
    path: '',
    component: SearchPageComponent,
  },
];

@NgModule({
  declarations: [SearchPageComponent],
  imports: [RouterModule.forChild(routes), InstitutionsSectionComponent, AuthorsSectionComponent, BooksSectionComponent, GenresSectionComponent, PeriodicalsSectionComponent, MapSectionComponent, DocumentTypesSectionComponent, ImagesSectionComponent, HeaderComponent, SearchHeroComponent,
    StoreModule.forFeature('periodicals', periodicalsReducer),
    StoreModule.forFeature('books', booksReducer),
    StoreModule.forFeature('genres', genresReducer),
    StoreModule.forFeature('document-types', documentTypesReducer),
    StoreModule.forFeature('search-results', searchReducer),
    EffectsModule.forFeature([PeriodicalsEffects, BooksEffects, GenresEffects, DocumentTypesEffects, SearchEffects]), FooterComponent,
  ],
})
export class SearchPageModule {
}
