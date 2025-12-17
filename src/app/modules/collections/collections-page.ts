import { Component, inject, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy, signal } from '@angular/core';
import { InlineLoaderComponent } from '../../shared/components/inline-loader/inline-loader.component';
import { SelectionService } from '../../shared/services';
import { CollectionsService } from '../../shared/services/collections.service';
import { SearchDocument } from '../models/search-document';
import { RecordItem, searchDocumentToRecordItem } from '../../shared/components/record-item/record-item.model';
import { AppTranslationService } from '../../shared/translation/app-translation.service';
import { Metadata } from '../../shared/models/metadata.model';
import { RecordHandlerService } from '../../shared/services/record-handler.service';
import { SolrSortDirections, SolrSortFields } from '../../core/solr/solr-helpers';
import { Subject, takeUntil } from 'rxjs';
import { UiStateService } from '../../shared/services/ui-state.service';

@Component({
  selector: 'app-collections-page',
  templateUrl: './collections-page.html',
  styleUrl: './collections-page.scss',
  standalone: false
})
export class CollectionsPage implements OnInit, AfterViewInit, OnDestroy {

  public selectionService = inject(SelectionService);
  public collectionsService = inject(CollectionsService);
  public translationService = inject(AppTranslationService);
  public recordHandler = inject(RecordHandlerService);
  private uiStateService = inject(UiStateService);

  @ViewChild('descriptionElement') descriptionElement?: ElementRef<HTMLElement>;

  isDescriptionExpanded = false;
  isDescriptionTruncated = false;
  rightSidebarVisible = this.uiStateService.metadataSidebarOpen;
  sidebarPositionMode: 'absolute' | 'relative' = 'absolute'; // 'absolute' = over content, 'relative' = beside content

  private destroy$ = new Subject<void>();

  ngOnInit() {
    // Check for truncation when detail data loads
    this.collectionsService.detail$
      .pipe(takeUntil(this.destroy$))
      .subscribe(detail => {
        if (detail) {
          // Wait for DOM to update with new content
          setTimeout(() => {
            if (this.descriptionElement) {
              this.checkIfTruncated(this.descriptionElement.nativeElement);
            }
          }, 100);
        }
      });
  }

  ngAfterViewInit() {
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  checkIfTruncated(element: HTMLElement) {
    // Get clamped height
    const clampedHeight = element.clientHeight;

    // Add a class to temporarily remove line-clamp
    element.classList.add('check-height');

    // Force reflow to apply the class
    element.offsetHeight;

    // Measure full height
    const fullHeight = element.scrollHeight;

    // Remove temporary class
    element.classList.remove('check-height');

    this.isDescriptionTruncated = fullHeight > clampedHeight;
  }

  toggleDescription() {
    this.isDescriptionExpanded = !this.isDescriptionExpanded;
  }

  toRecordItem(doc: SearchDocument): RecordItem {
    return searchDocumentToRecordItem(doc);
  }

  /**
   * Gets the collection description in the current language
   */
  getLocalizedDescription(metadata: Metadata): string {
    if (!metadata || !metadata.notes) return '';

    const currentLang = this.translationService.currentLanguage().code;

    const note = metadata.notes.find(n => n.lang === currentLang);

    // Try current language
    if (note) {
      return note.text;
    }

    const enNote = metadata.notes.find(n => n.lang === 'en');
    // Fall back to English
    if (enNote) {
      return enNote.text;
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

  showRightSidebar() {
    this.uiStateService.setMetadataSidebarState(true);
  }

  hideRightSidebar() {
    this.uiStateService.setMetadataSidebarState(false);
  }
}
