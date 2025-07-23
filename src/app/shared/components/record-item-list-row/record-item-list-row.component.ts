import { Component, Input } from '@angular/core';
import { SearchDocument } from '../../../modules/models/search-document';
import { TranslatePipe } from '@ngx-translate/core';
import { NgClass, NgForOf, NgIf } from '@angular/common';
import { AccessibilityBadgeComponent } from '../accessibility-badge/accessibility-badge.component';
import { languageMap } from '../../misc/language-map';
import { EnvironmentService } from '../../services/environment.service';
import {DocumentAccessibilityEnum} from '../../../modules/constants/document-accessibility';

@Component({
  selector: 'tr[app-record-item-list-row]',
  imports: [
    TranslatePipe,
    NgIf,
    NgForOf,
    AccessibilityBadgeComponent,
  ],
  templateUrl: './record-item-list-row.component.html',
  styleUrl: './record-item-list-row.component.scss'
})
export class RecordItemListRowComponent {

  @Input() record!: SearchDocument;
  @Input() url!: string;

  protected readonly languageMap = languageMap;

  private krameriusBaseUrl: string;

  constructor(private envService: EnvironmentService) {
    this.krameriusBaseUrl = this.envService.getApiUrl('items');
  }

  getKrameriusBaseUrl(): string {
    return this.krameriusBaseUrl + '/' + this.record.pid + '/image/thumb';
  }

  protected readonly DocumentAccessibilityEnum = DocumentAccessibilityEnum;
}
