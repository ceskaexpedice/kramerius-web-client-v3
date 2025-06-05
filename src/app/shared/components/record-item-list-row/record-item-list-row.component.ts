import {Component, Input} from '@angular/core';
import {SearchDocument} from '../../../modules/models/search-document';
import {TranslatePipe} from '@ngx-translate/core';
import {NgClass, NgForOf, NgIf} from '@angular/common';
import {AccessibilityBadgeComponent} from '../accessibility-badge/accessibility-badge.component';
import {languageMap} from '../../misc/language-map';

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

  protected readonly languageMap = languageMap;
}
