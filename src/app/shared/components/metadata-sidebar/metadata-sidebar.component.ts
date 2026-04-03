import { Component, inject, Input, Output, EventEmitter, Optional } from '@angular/core';
import { NgIf, NgTemplateOutlet } from '@angular/common';

import { Metadata } from '../../models/metadata.model';
import { TabsComponent } from '../tabs/tabs.component';
import { TabItemComponent } from '../tabs/tab-item.component';
import { MetadataSection } from '../metadata-section/metadata-section';
import { RecordHandlerService } from '../../services/record-handler.service';
import { DetailViewService } from '../../../modules/detail-view-page/services/detail-view.service';
import { TranslatePipe } from '@ngx-translate/core';
import { ExportDocumentSectionComponent } from './export-document-section-component/export-document-section-component';
import { SearchResultsSidebarComponent } from './search-results-sidebar/search-results-sidebar.component';
import { SearchService } from '../../services/search.service';
import { AsyncPipe } from '@angular/common';
import { UiStateService } from "../../services/ui-state.service";
import { ConfigService } from '../../../core/config';
import { AiActionsComponent } from './ai-actions/ai-actions.component';

@Component({
  selector: 'app-metadata-sidebar',
  imports: [TabsComponent, TabItemComponent, MetadataSection, TranslatePipe, ExportDocumentSectionComponent, SearchResultsSidebarComponent, AsyncPipe, NgIf, NgTemplateOutlet, AiActionsComponent],
  templateUrl: './metadata-sidebar.component.html',
  styleUrl: './metadata-sidebar.component.scss'
})
export class MetadataSidebarComponent {
  @Input() metadata: Metadata | null = null;
  @Input() mode: 'floating' | 'docked' = 'floating';
  @Input() tools: { search: boolean; export: boolean; description: boolean; ai?: boolean } = { search: true, export: true, description: false };
  @Input() customDescription = false;

  @Output() close = new EventEmitter<void>();

  recordHandler = inject(RecordHandlerService);
  detailService = inject(DetailViewService, { optional: true });
  searchService = inject(SearchService);
  uiStateService = inject(UiStateService);
  configService = inject(ConfigService);

  exportAsPdf(): void {

    // TODO: Implement PDF export
    console.log('Export as PDF');
  }

  exportAsText(): void {
    // TODO: Implement text export
    console.log('Export as text');
  }

  exportAsImages(): void {
    // TODO: Implement images export
    console.log('Export as images');
  }

  onTabChanged(tabLabel: string) {
    this.uiStateService.setMetadataSidebarActiveTab(tabLabel);
  }

  closeMetadataSidebar(): void {
    // First try to emit the close event for custom handling
    if (this.close.observed) {
      this.close.emit();
    } else if (this.detailService) {
      // Fall back to DetailViewService if available (for backward compatibility)
      this.detailService.hideMetadataSidebar();
    }
  }
}
