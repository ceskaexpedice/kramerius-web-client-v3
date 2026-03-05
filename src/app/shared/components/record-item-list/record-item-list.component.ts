import {Component, EventEmitter, inject, Input, OnInit, Output} from '@angular/core';
import {SearchDocument} from '../../../modules/models/search-document';
import {NgForOf, NgIf} from '@angular/common';
import {RecordItemListRowComponent} from '../record-item-list-row/record-item-list-row.component';
import {RecordHandlerService} from '../../services/record-handler.service';
import {TranslatePipe} from '@ngx-translate/core';
import {DisplayConfigService} from '../../services/display-config.service';
import {TableColumnConfig} from '../../models/display-config.model';

@Component({
  selector: 'app-record-item-list',
  imports: [
    NgIf,
    RecordItemListRowComponent,
    NgForOf,
    TranslatePipe,
  ],
  templateUrl: './record-item-list.component.html',
  styleUrl: './record-item-list.component.scss'
})
export class RecordItemListComponent implements OnInit {

  @Input() records: SearchDocument[] = [];
  @Input() currentFolderId?: string;

  @Output() exportRecord = new EventEmitter<SearchDocument>();

  public recordHandler = inject(RecordHandlerService);
  private displayConfigService = inject(DisplayConfigService);

  visibleColumns: TableColumnConfig[] = [];

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
    this.exportRecord.emit(record);
  }

}
