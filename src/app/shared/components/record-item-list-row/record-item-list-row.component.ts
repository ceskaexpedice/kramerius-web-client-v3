import {Component, inject, Input} from '@angular/core';
import { SearchDocument } from '../../../modules/models/search-document';
import { TranslatePipe } from '@ngx-translate/core';
import { NgForOf, NgIf } from '@angular/common';
import { AccessibilityBadgeComponent } from '../accessibility-badge/accessibility-badge.component';
import { CheckboxComponent } from '../checkbox/checkbox.component';
import { languageMap } from '../../misc/language-map';
import { EnvironmentService } from '../../services/environment.service';
import {DocumentAccessibilityEnum} from '../../../modules/constants/document-accessibility';
import {RecordHandlerService} from '../../services/record-handler.service';
import { SelectionService } from '../../services';
import { PluralizePipe } from '../../pipes/pluralize.pipe';
import { TableColumnConfig, ColumnRenderType } from '../../models/display-config.model';

@Component({
  selector: 'tr[app-record-item-list-row]',
  imports: [
    TranslatePipe,
    NgIf,
    NgForOf,
    AccessibilityBadgeComponent,
    CheckboxComponent,
    PluralizePipe,
  ],
  templateUrl: './record-item-list-row.component.html',
  styleUrl: './record-item-list-row.component.scss',
  host: {
    '[class.selection-mode]': 'selectionService.selectionMode()',
    '[class.selected]': 'selectionService.selectionMode() && selectionService.isSelected(record.pid)',
    '(click)': 'onRowClick($event)'
  }
})
export class RecordItemListRowComponent {

  @Input() record!: SearchDocument;
  @Input() url!: string;
  @Input() visibleColumns: TableColumnConfig[] = [];

  recordHandler = inject(RecordHandlerService);
  public selectionService = inject(SelectionService);

  protected readonly languageMap = languageMap;
  protected readonly ColumnRenderType = ColumnRenderType;

  private krameriusBaseUrl: string;

  constructor(private envService: EnvironmentService) {
    this.krameriusBaseUrl = this.envService.getApiUrl('items');
  }

  getKrameriusBaseUrl(): string {
    return this.krameriusBaseUrl + '/' + this.record.pid + '/image/thumb';
  }

  /**
   * Gets the value for a column from the record
   */
  getColumnValue(column: TableColumnConfig): any {
    return (this.record as any)[column.field];
  }

  /**
   * Formats an array field for display
   */
  formatArrayValue(value: string[] | undefined, maxLength: number = 50): string {
    if (!value || value.length === 0) {
      return '—';
    }

    const joined = value.join(', ');
    if (joined.length > maxLength) {
      return joined.slice(0, maxLength) + '...';
    }
    return joined;
  }

  /**
   * Formats author array
   */
  formatAuthors(authors: string[] | undefined): string {
    if (!authors || authors.length === 0) {
      return '';
    }

    const joined = authors.join(', ');
    if (joined.length > 35) {
      return joined.slice(0, 35) + '...';
    }
    return joined;
  }

  onRowClick(event: MouseEvent): void {
    // This handles clicks on the entire row (when in selection mode)
    if (this.selectionService.selectionMode()) {
      event.preventDefault();
      this.selectionService.toggleItem(this.record.pid);
    }
    // In normal mode, row clicks don't do anything (let individual elements handle their clicks)
  }

  onTitleClick(event: MouseEvent): void {
    // This handles clicks specifically on the title/link area
    if (this.selectionService.selectionMode()) {
      event.preventDefault();
      this.selectionService.toggleItem(this.record.pid);
    } else {
      this.recordHandler.onNavigate(event, this.url);
    }
  }

  onSelectionChange(selected: boolean): void {
    if (selected) {
      this.selectionService.selectItem(this.record.pid);
    } else {
      this.selectionService.deselectItem(this.record.pid);
    }
  }

  protected readonly DocumentAccessibilityEnum = DocumentAccessibilityEnum;
}
