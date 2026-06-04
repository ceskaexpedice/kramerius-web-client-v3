import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { AsyncPipe, NgClass, NgForOf, NgIf, NgTemplateOutlet } from '@angular/common';
import { SearchService } from '../../../../shared/services/search.service';
import { PageSearchService } from '../../../../shared/services/page-search.service';
import { AdvancedSearchService } from '../../../../shared/services/advanced-search.service';
import { AdminModeService } from '../../../../shared/services';
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
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, map } from 'rxjs';
import { WhereToSearchToggleComponent } from '../where-to-search-toggle/where-to-search-toggle.component';
import { customDefinedFacetsEnum } from '../../const/facets';

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
    TranslatePipe,
    WhereToSearchToggleComponent,
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
  pageSearchService = inject(PageSearchService);
  advancedSearchService = inject(AdvancedSearchService);
  adminModeService = inject(AdminModeService);
  breakpointService = inject(BreakpointService);

  protected readonly ViewOptions = AppResultsViewType;

  // whereToSearch is surfaced via the dedicated toggle, and the search term is shown
  // in the search box, so drop both from the tag row.
  visibleSelectedTags$: Observable<string[]> = this.searchService.selectedTags.pipe(
    map(tags => tags.filter(t =>
      !t.startsWith(customDefinedFacetsEnum.whereToSearchModel + ':'))),
  );

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
