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
import {periodicalsReducer} from './state/periodicals/periodicals.reducer';
import {EffectsModule} from '@ngrx/effects';
import {PeriodicalsEffects} from './state/periodicals/periodicals.effects';
import {BooksEffects} from './state/books/books.effects';
import {booksReducer} from './state/books/books.reducer';
import {GenresEffects} from './state/genres/genres.effects';
import {genresReducer} from './state/genres/genres.reducer';
import {DocumentTypesEffects} from './state/document-types/document-types.effects';
import {documentTypesReducer} from './state/document-types/document-types.reducer';
import {FooterComponent} from '../../core/layout/footer/footer.component';
import {SearchEffects} from '../search-results-page/state/search.effects';
import {searchReducer} from '../search-results-page/state/search.reducer';
import {SearchService} from '../../shared/services/search.service';
import {musicDetailReducer} from '../music/state/music-detail.reducer';
import {routerReducer} from '@ngrx/router-store';

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
    StoreModule.forFeature('music', musicDetailReducer),
    StoreModule.forFeature('router', routerReducer),
    EffectsModule.forFeature([PeriodicalsEffects, BooksEffects, GenresEffects, DocumentTypesEffects, SearchEffects]), FooterComponent,
  ],
  providers: [
    { provide: 'FilterService', useClass: SearchService }
  ]
})
export class SearchPageModule {
}
