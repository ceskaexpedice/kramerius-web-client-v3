import {Component, inject} from '@angular/core';
import {ViewMode} from './models/view-mode.enum';
import {RecordInfoService} from '../../shared/services/record-info.service';
import {PeriodicalService} from '../../shared/services/periodical.service';
import {RecordHandlerService} from '../../shared/services/record-handler.service';

@Component({
  selector: 'app-periodical-view-page',
  standalone: false,
  templateUrl: './periodical-page.component.html',
  styleUrl: './periodical-page.component.scss'
})
export class PeriodicalPageComponent {
  periodical = inject(PeriodicalService);
  public recordInfoService = inject(RecordInfoService);
  public recordHandler = inject(RecordHandlerService);

  protected readonly ViewMode = ViewMode;

  constructor() {
    this.periodical.watchRouteParams();
  }

  ngOnInit(): void {
  }

  openRecordInfo() {
    // get uuid from document
    if (!this.periodical.uuid) return;
    this.recordInfoService.openRecordInfoDialog(this.periodical.uuid);
  }

}
