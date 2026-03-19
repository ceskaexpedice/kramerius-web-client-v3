import {Component, inject, OnInit} from '@angular/core';
import {AsyncPipe, NgForOf, NgIf} from '@angular/common';
import {CategoryItemComponent} from '../../../../shared/components/category-item/category-item.component';
import {TranslatePipe} from '@ngx-translate/core';
import {Store} from '@ngrx/store';
import {selectGenres, selectGenresLoading} from '../../state/genres/genres.selectors';
import {loadGenres} from '../../state/genres/genres.actions';
import {SearchService} from '../../../../shared/services/search.service';
import {APP_ROUTES_ENUM} from '../../../../app.routes';
import {InlineLoaderComponent} from '../../../../shared/components/inline-loader/inline-loader.component';
import {LibraryContextService} from '../../../../shared/services/library-context.service';

@Component({
  selector: 'app-genres-section',
  imports: [
    NgForOf,
    CategoryItemComponent,
    TranslatePipe,
    NgIf,
    AsyncPipe,
    InlineLoaderComponent,
  ],
  templateUrl: './genres-section.component.html',
  styleUrls: ['./genres-section.component.scss', '../search-section.scss']
})
export class GenresSectionComponent implements OnInit {
  private store = inject(Store);
  private searchService = inject(SearchService);
  private libraryContext = inject(LibraryContextService);

  genres$ = this.store.select(selectGenres);
  loading$ = this.store.select(selectGenresLoading);

  ngOnInit(): void {
    this.store.dispatch(loadGenres());
  }

  clickedGenre(genreName: string) {
    const url = `?fq=genres.facet:${genreName}&genres.facet_operator=OR`;
    this.searchService.redirectDirectlyToUrl(url);
  }

  getGenreUrl(genreName: string): string {
    const prefix = this.libraryContext.getLibraryPrefix();
    return `${prefix}/${APP_ROUTES_ENUM.SEARCH_RESULTS}?fq=genres.facet:${genreName}&genres.facet_operator=OR`;
  }

}
