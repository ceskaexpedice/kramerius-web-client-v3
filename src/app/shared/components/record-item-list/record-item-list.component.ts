import {Component, inject, Input} from '@angular/core';
import {SearchDocument} from '../../../modules/models/search-document';
import {NgForOf, NgIf, NgTemplateOutlet} from '@angular/common';
import {RecordItemListRowComponent} from '../record-item-list-row/record-item-list-row.component';
import {RecordHandlerService} from '../../services/record-handler.service';

@Component({
  selector: 'app-record-item-list',
  imports: [
    NgIf,
    RecordItemListRowComponent,
    NgForOf,
    NgTemplateOutlet,
  ],
  templateUrl: './record-item-list.component.html',
  styleUrl: './record-item-list.component.scss'
})
export class RecordItemListComponent {

  @Input() records: SearchDocument[] = [];

  private recordHandler = inject(RecordHandlerService);

  onClick(e: MouseEvent, record: SearchDocument) {
    e.stopPropagation();
    this.recordHandler.handleDocumentClick(record);
  }

}
