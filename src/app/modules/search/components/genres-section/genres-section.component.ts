import {Component, inject, OnInit} from '@angular/core';
import {AsyncPipe, NgForOf, NgIf} from '@angular/common';
import {CategoryItemComponent} from '../../../../shared/components/category-item/category-item.component';
import {TranslatePipe} from '@ngx-translate/core';
import {Store} from '@ngrx/store';
import {selectBooks, selectBooksLoading} from '../../../../state/search/books/books.selectors';
import {loadBooks} from '../../../../state/search/books/books.actions';
import {selectGenres, selectGenresLoading} from '../../../../state/search/genres/genres.selectors';
import {loadGenres} from '../../../../state/search/genres/genres.actions';

@Component({
  selector: 'app-genres-section',
  imports: [
    NgForOf,
    CategoryItemComponent,
    TranslatePipe,
    NgIf,
    AsyncPipe,
  ],
  templateUrl: './genres-section.component.html',
  styleUrl: './genres-section.component.scss'
})
export class GenresSectionComponent implements OnInit {

  private store = inject(Store);

  genres$ = this.store.select(selectGenres);
  loading$ = this.store.select(selectGenresLoading);

  ngOnInit(): void {
    this.store.dispatch(loadGenres());
  }

}
