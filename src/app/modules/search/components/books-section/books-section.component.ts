import {Component, inject, OnInit} from '@angular/core';
import {CarouselComponent} from '../../../../shared/components/carousel/carousel.component';
import {ItemCardComponent} from '../../../../shared/components/item-card/item-card.component';
import {AsyncPipe, NgForOf, NgIf, TitleCasePipe} from '@angular/common';
import {Store} from '@ngrx/store';
import {selectPeriodicals, selectPeriodicalsLoading} from '../../state/periodicals/periodicals.selectors';
import {loadPeriodicals} from '../../state/periodicals/periodicals.actions';
import {selectBooks, selectBooksLoading} from '../../state/books/books.selectors';
import {loadBooks} from '../../state/books/books.actions';
import {TranslatePipe} from '@ngx-translate/core';
import {customDefinedFacetsEnum} from '../../../search-results-page/const/facets';
import {DocumentTypeEnum} from '../../../constants/document-type';
import {SearchService} from '../../../../shared/services/search.service';
import {RecordItemComponent} from '../../../../shared/components/record-item/record-item.component';

@Component({
  selector: 'app-books-section',
  imports: [
    CarouselComponent,
    ItemCardComponent,
    NgForOf,
    NgIf,
    AsyncPipe,
    TranslatePipe,
    TitleCasePipe,
    RecordItemComponent,
  ],
  templateUrl: './books-section.component.html',
  styleUrls: ['./books-section.component.scss', '../search-section.scss']
})
export class BooksSectionComponent implements OnInit {

  private store = inject(Store);
  private searchService = inject(SearchService);

  books$ = this.store.select(selectBooks);
  loading$ = this.store.select(selectBooksLoading);

  ngOnInit(): void {
    this.store.dispatch(loadBooks());
  }

  showMore() {
    this.searchService.searchWithFacet(`${customDefinedFacetsEnum.model}`, DocumentTypeEnum.monograph, true);
  }

}
