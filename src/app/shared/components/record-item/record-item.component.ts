import { Component, inject, Input } from '@angular/core';
import { SearchDocument } from '../../../modules/models/search-document';
import { NgClass, NgIf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { APP_ROUTES_ENUM } from '../../../app.routes';
import { RecordHandlerService } from '../../services/record-handler.service';
import { EnvironmentService } from '../../services/environment.service';

@Component({
  selector: 'app-record-item',
  imports: [
    NgIf,
    TranslatePipe,
  ],
  templateUrl: './record-item.component.html',
  styleUrl: './record-item.component.scss'
})
export class RecordItemComponent {

  recordHandler = inject(RecordHandlerService);

  @Input() record: SearchDocument = {} as SearchDocument;

  router = inject(Router);

  private krameriusBaseUrl: string;

  constructor(private envService: EnvironmentService) {
    this.krameriusBaseUrl = this.envService.get('krameriusBaseUrl');
  }

  onRecordClick(e: Event, record: SearchDocument): void {
    e.stopPropagation();
    // redirect to detail view with ?uuid=record.uuId
    this.recordHandler.handleDocumentClick(record)
  }

  getKrameriusBaseUrl(): string {
    return this.krameriusBaseUrl;
  }
}
