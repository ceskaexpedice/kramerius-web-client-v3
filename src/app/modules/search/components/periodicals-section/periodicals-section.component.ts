import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe, NgForOf } from '@angular/common';
import { CarouselComponent } from '../../../../shared/components/carousel/carousel.component';
import { Store } from '@ngrx/store';
import { selectPeriodicals, selectPeriodicalsLoading } from '../../state/periodicals/periodicals.selectors';
import { loadPeriodicals } from '../../state/periodicals/periodicals.actions';
import { TranslatePipe } from '@ngx-translate/core';
import { DocumentTypeEnum } from '../../../constants/document-type';
import { SearchService } from '../../../../shared/services/search.service';
import { customDefinedFacetsEnum } from '../../../search-results-page/const/facets';
import { RecordItemComponent } from '../../../../shared/components/record-item/record-item.component';
import { RecordItem, searchDocumentToRecordItem } from '../../../../shared/components/record-item/record-item.model';
import { SearchDocument } from '../../../models/search-document';
import { SkeletonListPipe } from '../../../../shared/pipes/skeleton-list.pipe';

@Component({
  selector: 'app-periodicals-section',
  imports: [
    NgForOf,
    CarouselComponent,
    AsyncPipe,
    TranslatePipe,
    RecordItemComponent,
    SkeletonListPipe,
  ],
  templateUrl: './periodicals-section.component.html',
  styleUrls: ['./periodicals-section.component.scss', '../search-section.scss'],
})
export class PeriodicalsSectionComponent implements OnInit {

  private store = inject(Store);
  private searchService = inject(SearchService);

  periodicals$ = this.store.select(selectPeriodicals);
  loading$ = this.store.select(selectPeriodicalsLoading);

  ngOnInit(): void {
    this.store.dispatch(loadPeriodicals());
  }

  showMore() {
    this.searchService.searchWithFacet(`${customDefinedFacetsEnum.model}`, DocumentTypeEnum.periodical, true);
  }

  // Convert SearchDocument to RecordItem
  toRecordItem(doc: SearchDocument): RecordItem {
    return searchDocumentToRecordItem(doc);
  }

}
