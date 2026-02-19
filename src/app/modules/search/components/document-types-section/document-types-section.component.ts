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
import {customDefinedFacetsEnum, facetKeysEnum} from '../../../search-results-page/const/facets';
import {APP_ROUTES_ENUM} from '../../../../app.routes';
import {InlineLoaderComponent} from '../../../../shared/components/inline-loader/inline-loader.component';
import {map} from 'rxjs';
import {getModelIcon} from '../../../../shared/utils/filter-icons.utils';

@Component({
  selector: 'app-document-types-section',
  imports: [
    AsyncPipe,
    CategoryItemComponent,
    NgForOf,
    NgIf,
    TranslatePipe,
    InlineLoaderComponent,
  ],
  templateUrl: './document-types-section.component.html',
  styleUrls: ['./document-types-section.component.scss', '../search-section.scss']
})
export class DocumentTypesSectionComponent {
  private searchService = inject(SearchService);
  private store = inject(Store);

  documentTypes$ = this.store.select(selectDocumentTypes).pipe(
    map(documentTypes => documentTypes?.map(docType => ({
      ...docType,
      // icon: getModelIcon(docType.name, 0)
    })))
  );
  loading$ = this.store.select(selectDocumentTypesLoading);

  ngOnInit(): void {
    this.store.dispatch(loadDocumentTypes());
  }

  clickedDocumentType(documentType: string) {
    const url = `${APP_ROUTES_ENUM.SEARCH_RESULTS}?customSearch=custom-root-model:${documentType}`;
    this.searchService.redirectDirectlyToUrl(url);
    this.searchService.searchWithFacet(customDefinedFacetsEnum.model, documentType, true);
  }

  getDocumentTypeUrl(documentType: string): string {
    return `${APP_ROUTES_ENUM.SEARCH_RESULTS}?customSearch=custom-root-model:${documentType}`;
  }
}
