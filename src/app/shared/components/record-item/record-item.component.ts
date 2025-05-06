import {Component, inject, Input} from '@angular/core';
import {SearchDocument} from '../../../modules/models/search-document';
import {NgClass, NgIf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {Router} from '@angular/router';
import {APP_ROUTES_ENUM} from '../../../app.routes';

@Component({
  selector: 'app-record-item',
  imports: [
    NgIf,
    NgClass,
    TranslatePipe,
  ],
  templateUrl: './record-item.component.html',
  styleUrl: './record-item.component.scss'
})
export class RecordItemComponent {

  @Input() record: SearchDocument = {} as SearchDocument;

  router = inject(Router);

  onRecordClick(e: Event, record: SearchDocument): void {
    e.stopPropagation();
    // redirect to detail view with ?uuid=record.uuId
    this.router.navigate([APP_ROUTES_ENUM.DETAIL_VIEW], { queryParams: { uuid: record.pid } });
  }
}
