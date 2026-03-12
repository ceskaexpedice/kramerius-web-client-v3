import {
  Component, ElementRef, EventEmitter, inject, Input, OnInit, Output, NgZone, OnDestroy, signal, ViewChild,
} from '@angular/core';
import {SearchDocument} from '../../../modules/models/search-document';
import {NgForOf, NgIf} from '@angular/common';
import {RecordItemListRowComponent} from '../record-item-list-row/record-item-list-row.component';
import {RecordHandlerService} from '../../services/record-handler.service';
import {TranslatePipe} from '@ngx-translate/core';
import {DisplayConfigService} from '../../services/display-config.service';
import {TableColumnConfig} from '../../models/display-config.model';
import {LocalStorageService} from '../../services/local-storage.service';

const COLUMN_WIDTHS_KEY = 'record-table-column-widths';

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
export class RecordItemListComponent implements OnInit, OnDestroy {

  @Input() records: SearchDocument[] = [];
  @Input() currentFolderId?: string;
  @Input() exportedRecord: SearchDocument | null = null;
  @Input() loading = false;
  @Input() skeletonCount = 60;

  @Output() exportRecord = new EventEmitter<SearchDocument>();

  public recordHandler = inject(RecordHandlerService);
  private displayConfigService = inject(DisplayConfigService);
  private localStorageService = inject(LocalStorageService);
  private ngZone = inject(NgZone);

  visibleColumns: TableColumnConfig[] = [];
  isScrolled = signal(false);
  skeletonRows = Array(60).fill(0);

  @ViewChild('tableWrapper') tableWrapper!: ElementRef<HTMLDivElement>;
  @ViewChild('recordTable') recordTable!: ElementRef<HTMLTableElement>;

  private resizingIndex: number | null = null;
  private resizeStartX = 0;
  private resizeStartWidth = 0;
  private onMouseMove = this.handleMouseMove.bind(this);
  private onMouseUp = this.handleMouseUp.bind(this);

  ngOnInit() {
    this.skeletonRows = Array(this.skeletonCount).fill(0);
    this.loadVisibleColumns();

    // Subscribe to changes in column configuration
    this.displayConfigService.displayConfig$.subscribe(() => {
      this.loadVisibleColumns();
    });
  }

  ngOnDestroy() {
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }

  loadVisibleColumns() {
    this.visibleColumns = this.displayConfigService.getVisibleColumns();
    const saved = this.localStorageService.get<Record<string, string>>(COLUMN_WIDTHS_KEY);
    if (saved) {
      this.visibleColumns = this.visibleColumns.map(col =>
        saved[col.id] ? { ...col, width: saved[col.id] } : col
      );
    }
  }

  onResizeStart(event: MouseEvent, index: number) {
    event.preventDefault();
    this.resizingIndex = index;
    this.resizeStartX = event.clientX;
    this.resizeStartWidth = parseInt(this.visibleColumns[index].width ?? '150', 10);
    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('mousemove', this.onMouseMove);
      document.addEventListener('mouseup', this.onMouseUp);
    });
  }

  private handleMouseMove(event: MouseEvent) {
    if (this.resizingIndex === null) return;
    const delta = event.clientX - this.resizeStartX;
    const newWidth = Math.max(50, this.resizeStartWidth + delta);
    const col = this.recordTable.nativeElement.querySelectorAll('colgroup col')[this.resizingIndex] as HTMLElement;
    if (col) col.style.width = `${newWidth}px`;
  }

  private handleMouseUp() {
    if (this.resizingIndex === null) return;
    // Sync DOM widths back to data model after drag ends
    const cols = this.recordTable.nativeElement.querySelectorAll('colgroup col');
    this.visibleColumns.forEach((column, i) => {
      const colEl = cols[i] as HTMLElement;
      if (colEl) column.width = colEl.style.width;
    });
    const saved = this.visibleColumns.reduce((acc, col) => {
      if (col.width) acc[col.id] = col.width;
      return acc;
    }, {} as Record<string, string>);
    this.localStorageService.set(COLUMN_WIDTHS_KEY, saved);
    this.resizingIndex = null;
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }

  onClick(e: MouseEvent, record: SearchDocument) {
    e.stopPropagation();
    this.recordHandler.handleDocumentClick(record);
  }

  onDownloadClicked(record: SearchDocument): void {
    this.exportRecord.emit(record);
  }

  onTableScroll(event: Event): void {
    this.isScrolled.set((event.target as HTMLElement).scrollLeft > 0);
  }

}
