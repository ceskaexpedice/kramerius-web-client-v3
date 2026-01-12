import {Component, inject, OnInit} from '@angular/core';
import {CarouselComponent} from '../../../../shared/components/carousel/carousel.component';
import {AsyncPipe, NgForOf, TitleCasePipe} from '@angular/common';
import {Store} from '@ngrx/store';
import {selectBooks, selectBooksLoading} from '../../state/books/books.selectors';
import {loadBooks} from '../../state/books/books.actions';
import {TranslatePipe} from '@ngx-translate/core';
import {customDefinedFacetsEnum} from '../../../search-results-page/const/facets';
import {DocumentTypeEnum} from '../../../constants/document-type';
import {SearchService} from '../../../../shared/services/search.service';
import {RecordItemComponent} from '../../../../shared/components/record-item/record-item.component';
import {RecordItem, searchDocumentToRecordItem} from '../../../../shared/components/record-item/record-item.model';
import {SearchDocument} from '../../../models/search-document';
import {SkeletonListPipe} from '../../../../shared/pipes/skeleton-list.pipe';

@Component({
  selector: 'app-books-section',
  imports: [
    CarouselComponent,
    NgForOf,
    AsyncPipe,
    TranslatePipe,
    TitleCasePipe,
    RecordItemComponent,
    SkeletonListPipe,
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

  // Convert SearchDocument to RecordItem
  toRecordItem(doc: SearchDocument): RecordItem {
    return searchDocumentToRecordItem(doc);
  }

}
