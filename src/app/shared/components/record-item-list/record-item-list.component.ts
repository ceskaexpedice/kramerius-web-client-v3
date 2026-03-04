import {Component, inject, Input, OnInit} from '@angular/core';
import {SearchDocument} from '../../../modules/models/search-document';
import {NgForOf, NgIf} from '@angular/common';
import {RecordItemListRowComponent} from '../record-item-list-row/record-item-list-row.component';
import {RecordHandlerService} from '../../services/record-handler.service';
import {TranslatePipe} from '@ngx-translate/core';
import {DisplayConfigService} from '../../services/display-config.service';
import {TableColumnConfig} from '../../models/display-config.model';
import {RecordExportPanelComponent} from '../record-export-panel/record-export-panel.component';

@Component({
  selector: 'app-record-item-list',
  imports: [
    NgIf,
    RecordItemListRowComponent,
    NgForOf,
    TranslatePipe,
    RecordExportPanelComponent,
  ],
  templateUrl: './record-item-list.component.html',
  styleUrl: './record-item-list.component.scss'
})
export class RecordItemListComponent implements OnInit {

  @Input() records: SearchDocument[] = [];
  @Input() currentFolderId?: string;

  public recordHandler = inject(RecordHandlerService);
  private displayConfigService = inject(DisplayConfigService);

  visibleColumns: TableColumnConfig[] = [];
  exportRecord: SearchDocument | null = null;

  ngOnInit() {
    this.loadVisibleColumns();

    // Subscribe to changes in column configuration
    this.displayConfigService.displayConfig$.subscribe(() => {
      this.loadVisibleColumns();
    });
  }

  loadVisibleColumns() {
    this.visibleColumns = this.displayConfigService.getVisibleColumns();
  }

  onClick(e: MouseEvent, record: SearchDocument) {
    e.stopPropagation();
    this.recordHandler.handleDocumentClick(record);
  }

  onDownloadClicked(record: SearchDocument): void {
    this.exportRecord = record;
  }

  closeExportSidebar(): void {
    this.exportRecord = null;
  }

}
