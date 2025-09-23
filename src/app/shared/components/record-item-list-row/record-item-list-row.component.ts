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

@Component({
  selector: 'tr[app-record-item-list-row]',
  imports: [
    TranslatePipe,
    NgIf,
    NgForOf,
    AccessibilityBadgeComponent,
    CheckboxComponent,
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

  recordHandler = inject(RecordHandlerService);
  public selectionService = inject(SelectionService);

  protected readonly languageMap = languageMap;

  private krameriusBaseUrl: string;

  constructor(private envService: EnvironmentService) {
    this.krameriusBaseUrl = this.envService.getApiUrl('items');
  }

  getKrameriusBaseUrl(): string {
    return this.krameriusBaseUrl + '/' + this.record.pid + '/image/thumb';
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
