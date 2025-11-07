import {Component, inject} from '@angular/core';
import {ActionToolbarComponent} from '../../shared/components/action-toolbar/action-toolbar.component';
import {FilterSidebarComponent} from '../search-results-page/components/filter-sidebar/filter-sidebar.component';
import {SelectionService} from '../../shared/services';
import {CollectionsService} from '../../shared/services/collections.service';
import {SearchDocument} from '../models/search-document';
import {RecordItem, searchDocumentToRecordItem} from '../../shared/components/record-item/record-item.model';

@Component({
  selector: 'app-collections-page',
  templateUrl: './collections-page.html',
  styleUrl: './collections-page.scss',
  standalone: false
})
export class CollectionsPage {

  public selectionService = inject(SelectionService);
  public collectionsService = inject(CollectionsService);

  toRecordItem(doc: SearchDocument): RecordItem {
    return searchDocumentToRecordItem(doc);
  }

}
