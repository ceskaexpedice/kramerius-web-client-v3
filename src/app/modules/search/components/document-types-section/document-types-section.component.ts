import {Component, inject} from '@angular/core';
import {AsyncPipe, NgForOf, NgIf} from '@angular/common';
import {CategoryItemComponent} from '../../../../shared/components/category-item/category-item.component';
import {TranslatePipe} from '@ngx-translate/core';
import {Store} from '@ngrx/store';
import {selectGenres, selectGenresLoading} from '../../state/genres/genres.selectors';
import {loadGenres} from '../../state/genres/genres.actions';
import {
  selectDocumentTypes,
  selectDocumentTypesLoading,
} from '../../state/document-types/document-types.selectors';
import {loadDocumentTypes} from '../../state/document-types/document-types.actions';
import {SearchService} from '../../../../shared/services/search.service';
import {DocumentTypeEnum} from '../../../constants/document-type';
import {customDefinedFacets, customDefinedFacetsEnum, facetKeysEnum} from '../../../search-results-page/const/facets';

@Component({
  selector: 'app-document-types-section',
  imports: [
    AsyncPipe,
    CategoryItemComponent,
    NgForOf,
    NgIf,
    TranslatePipe,
  ],
  templateUrl: './document-types-section.component.html',
  styleUrls: ['./document-types-section.component.scss', '../search-section.scss']
})
export class DocumentTypesSectionComponent {
  private searchService = inject(SearchService);
  private store = inject(Store);

  documentTypes$ = this.store.select(selectDocumentTypes);
  loading$ = this.store.select(selectDocumentTypesLoading);

  ngOnInit(): void {
    this.store.dispatch(loadDocumentTypes());
  }

  clickedDocumentType(documentType: string) {
    this.searchService.searchWithFacet(customDefinedFacetsEnum.model, documentType, true);
  }
}
