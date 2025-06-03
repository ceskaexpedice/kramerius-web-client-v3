import {Component, Input} from '@angular/core';
import {SearchDocument} from '../../../modules/models/search-document';
import {TranslatePipe} from '@ngx-translate/core';
import {NgClass, NgForOf, NgIf} from '@angular/common';

@Component({
  selector: 'tr[app-record-item-list-row]',
  imports: [
    TranslatePipe,
    NgClass,
    NgIf,
    NgForOf,
  ],
  templateUrl: './record-item-list-row.component.html',
  styleUrl: './record-item-list-row.component.scss'
})
export class RecordItemListRowComponent {

  @Input() record!: SearchDocument;

}
