import {Component, inject, Input, Output, EventEmitter} from '@angular/core';
import { SearchDocument } from '../../../modules/models/search-document';
import { TranslatePipe } from '@ngx-translate/core';
import { NgForOf, NgIf } from '@angular/common';
import { AccessibilityBadgeComponent } from '../accessibility-badge/accessibility-badge.component';
import { CheckboxComponent } from '../checkbox/checkbox.component';
import { EnvironmentService } from '../../services/environment.service';
import { LanguageBadgeComponent } from '../language-badge/language-badge.component';
import {RecordHandlerService} from '../../services/record-handler.service';
import { SelectionService } from '../../services';
import { PluralizePipe } from '../../pipes/pluralize.pipe';
import { TableColumnConfig, ColumnRenderType } from '../../models/display-config.model';
import { ThumbnailImageComponent } from '../thumbnail-image/thumbnail-image.component';
import {ModelBadgeComponent} from '../model-badge/model-badge.component';

@Component({
  selector: 'tr[app-record-item-list-row]',
  imports: [
    TranslatePipe,
    NgIf,
    NgForOf,
    AccessibilityBadgeComponent,
    CheckboxComponent,
    PluralizePipe,
    ThumbnailImageComponent,
    LanguageBadgeComponent,
    ModelBadgeComponent,
  ],
  templateUrl: './record-item-list-row.component.html',
  styleUrl: './record-item-list-row.component.scss',
  host: {
    '[class.selection-mode]': 'selectionService.selectionMode()',
    '[class.selected]': 'selectionService.selectionMode() && record && selectionService.isSelected(record.pid)',
    '[class.highlighted]': 'highlighted',
    '[class.skeleton-row]': 'loading',
    '(click)': 'onRowClick($event)'
  }
})
export class RecordItemListRowComponent {

  @Input() record: SearchDocument | null = null;
  @Input() url!: string;
  @Input() visibleColumns: TableColumnConfig[] = [];
  @Input() highlighted = false;
  @Input() loading = false;

  @Output() downloadClicked = new EventEmitter<SearchDocument>();

  recordHandler = inject(RecordHandlerService);
  public selectionService = inject(SelectionService);

  protected readonly ColumnRenderType = ColumnRenderType;

  private krameriusBaseUrl: string;

  constructor(private envService: EnvironmentService) {
    this.krameriusBaseUrl = this.envService.getApiUrl('items');
  }

  getKrameriusBaseUrl(): string {
    if (!this.record) return '';
    return this.krameriusBaseUrl + '/' + this.record.pid + '/image/thumb';
  }

  /**
   * Gets the value for a column from the record
   */
  getColumnValue(column: TableColumnConfig): any {
    if (!this.record) return '';
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
    if (this.loading || !this.record) return;
    // This handles clicks on the entire row (when in selection mode)
    if (this.selectionService.selectionMode()) {
      event.preventDefault();
      this.selectionService.toggleItem(this.record.pid);
    }
    // In normal mode, row clicks don't do anything (let individual elements handle their clicks)
  }

  onTitleClick(event: MouseEvent): void {
    if (!this.record) return;
    // This handles clicks specifically on the title/link area
    if (this.selectionService.selectionMode()) {
      event.preventDefault();
      this.selectionService.toggleItem(this.record.pid);
    } else {
      this.recordHandler.onNavigate(event, this.url);
    }
  }

  getDisplayTitle(): string {
    if (!this.record) return '';
    return this.record.title || this.record.rootTitle || '';
  }

  onSelectionChange(selected: boolean): void {
    if (!this.record) return;
    if (selected) {
      this.selectionService.selectItem(this.record.pid);
    } else {
      this.selectionService.deselectItem(this.record.pid);
    }
  }
}
