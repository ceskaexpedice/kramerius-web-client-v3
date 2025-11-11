import {Component, inject, OnInit} from '@angular/core';
import {ActionToolbarComponent} from '../../shared/components/action-toolbar/action-toolbar.component';
import {FilterSidebarComponent} from '../search-results-page/components/filter-sidebar/filter-sidebar.component';
import {SelectionService} from '../../shared/services';
import {CollectionsService} from '../../shared/services/collections.service';
import {SearchDocument} from '../models/search-document';
import {RecordItem, searchDocumentToRecordItem} from '../../shared/components/record-item/record-item.model';
import {AppTranslationService} from '../../shared/translation/app-translation.service';
import {Metadata} from '../../shared/models/metadata.model';
import {ViewMode} from '../periodical/models/view-mode.enum';
import {RecordHandlerService} from '../../shared/services/record-handler.service';
import {SolrSortDirections, SolrSortFields} from '../../core/solr/solr-helpers';

@Component({
  selector: 'app-collections-page',
  templateUrl: './collections-page.html',
  styleUrl: './collections-page.scss',
  standalone: false
})
export class CollectionsPage implements OnInit {

  public selectionService = inject(SelectionService);
  public collectionsService = inject(CollectionsService);
  public translationService = inject(AppTranslationService);
  public recordHandler = inject(RecordHandlerService);

  ngOnInit() {
  }

  toRecordItem(doc: SearchDocument): RecordItem {
    return searchDocumentToRecordItem(doc);
  }

  /**
   * Gets the collection description in the current language
   */
  getLocalizedDescription(metadata: Metadata): string {
    if (!metadata || !metadata.collectionDescriptions) return '';

    const currentLang = this.translationService.currentLanguage().code;

    // Try current language
    if (metadata.collectionDescriptions[currentLang]) {
      return metadata.collectionDescriptions[currentLang];
    }

    // Fall back to English
    if (metadata.collectionDescriptions['en']) {
      return metadata.collectionDescriptions['en'];
    }

    // Fall back to any available language
    const availableLanguages = Object.keys(metadata.collectionDescriptions);
    if (availableLanguages.length > 0) {
      return metadata.collectionDescriptions[availableLanguages[0]];
    }

    return '';
  }

  /**
   * Gets the collection title in the current language
   */
  getLocalizedTitle(metadata: Metadata): string {
    if (!metadata || !metadata.collectionTitles) return metadata?.mainTitle || '';

    const currentLang = this.translationService.currentLanguage().code;

    // Try current language
    if (metadata.collectionTitles[currentLang]) {
      return metadata.collectionTitles[currentLang];
    }

    // Fall back to English
    if (metadata.collectionTitles['en']) {
      return metadata.collectionTitles['en'];
    }

    // Fall back to any available language
    const availableLanguages = Object.keys(metadata.collectionTitles);
    if (availableLanguages.length > 0) {
      return metadata.collectionTitles[availableLanguages[0]];
    }

    // Last resort: use mainTitle
    return metadata.mainTitle || '';
  }

  onExportSelected(): void {
  }

  onEditSelected(selectedIds: string[]): void {
  }

  onSortChange(event: { value: SolrSortFields; direction: SolrSortDirections }) {
    this.collectionsService.changeSortBy(event.value, event.direction);
  }
}
