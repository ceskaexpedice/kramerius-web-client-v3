import {Component, inject, Input} from '@angular/core';
import {SearchDocument} from '../../../modules/models/search-document';
import {NgForOf, NgIf, NgTemplateOutlet} from '@angular/common';
import {RecordItemListRowComponent} from '../record-item-list-row/record-item-list-row.component';
import {RecordHandlerService} from '../../services/record-handler.service';
import {TranslatePipe} from '@ngx-translate/core';

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
export class RecordItemListComponent {

  @Input() records: SearchDocument[] = [];
  @Input() currentFolderId?: string;

  public recordHandler = inject(RecordHandlerService);

  onClick(e: MouseEvent, record: SearchDocument) {
    e.stopPropagation();
    this.recordHandler.handleDocumentClick(record);
  }

}
