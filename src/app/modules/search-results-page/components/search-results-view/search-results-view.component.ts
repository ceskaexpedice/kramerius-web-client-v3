import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { AsyncPipe, NgClass, NgForOf, NgIf, NgTemplateOutlet } from '@angular/common';
import { SearchService } from '../../../../shared/services/search.service';
import { AdvancedSearchService } from '../../../../shared/services/advanced-search.service';
import { SelectionService } from '../../../../shared/services';
import { AppResultsViewType } from '../../../settings/settings.model';
import { SearchDocument } from '../../../models/search-document';
import { RecordItem, searchDocumentToRecordItem } from '../../../../shared/components/record-item/record-item.model';
import { SolrSortDirections, SolrSortFields } from '../../../../core/solr/solr-helpers';
import { BreakpointService } from '../../../../shared/services/breakpoint.service';
import { RecordItemComponent } from '../../../../shared/components/record-item/record-item.component';
import { RecordItemListComponent } from '../../../../shared/components/record-item-list/record-item-list.component';
import { SelectedTagsComponent } from '../../../../shared/components/selected-tags/selected-tags.component';
import { PaginatorComponent } from '../../../../shared/components/paginator/paginator.component';
import { AdvancedSearchIndicatorComponent } from '../advanced-search-indicator/advanced-search-indicator.component';
import { NoResultsComponent } from '../no-results/no-results.component';
import { RecordExportPanelComponent } from '../../../../shared/components/record-export-panel/record-export-panel.component';
import { TabsComponent } from '../../../../shared/components/tabs/tabs.component';
import { TabItemComponent } from '../../../../shared/components/tabs/tab-item.component';
import { SkeletonListPipe } from '../../../../shared/pipes/skeleton-list.pipe';
import { ScrollHideHeaderDirective } from '../../../../shared/directives/scroll-hide-header.directive';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-search-results-view',
  standalone: true,
  imports: [
    AsyncPipe,
    NgIf,
    NgForOf,
    NgClass,
    NgTemplateOutlet,
    RecordItemComponent,
    RecordItemListComponent,
    SelectedTagsComponent,
    PaginatorComponent,
    AdvancedSearchIndicatorComponent,
    NoResultsComponent,
    RecordExportPanelComponent,
    TabsComponent,
    TabItemComponent,
    SkeletonListPipe,
    ScrollHideHeaderDirective,
    TranslatePipe,
  ],
  templateUrl: './search-results-view.component.html',
  styleUrl: './search-results-view.component.scss',
})
export class SearchResultsViewComponent {
  @Input() view!: AppResultsViewType;
  @Input() showSectionHeaders = false;
  @Input() showSelectedTags$!: Observable<boolean>;
  @Input() exportRecord: SearchDocument | null = null;

  @Output() exportRecordChange = new EventEmitter<SearchDocument | null>();
  @Output() sortChange = new EventEmitter<{ value: SolrSortFields; direction: SolrSortDirections }>();

  searchService = inject(SearchService);
  advancedSearchService = inject(AdvancedSearchService);
  selectionService = inject(SelectionService);
  breakpointService = inject(BreakpointService);

  protected readonly ViewOptions = AppResultsViewType;

  toRecordItem(doc: SearchDocument): RecordItem {
    return searchDocumentToRecordItem(doc);
  }

  openExportPanel(record: SearchDocument): void {
    this.exportRecordChange.emit(record);
  }

  closeExportPanel(): void {
    this.exportRecordChange.emit(null);
  }
}
