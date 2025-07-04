import { Component, inject } from '@angular/core';
import { EnvironmentService } from '../../shared/services/environment.service';
import {DetailViewService} from './services/detail-view.service';
import {RecordHandlerService} from '../../shared/services/record-handler.service';
import {DocumentTypeEnum} from '../constants/document-type';

@Component({
  selector: 'app-detail-view-page',
  templateUrl: './detail-view-page.component.html',
  styleUrl: './detail-view-page.component.scss',
  standalone: false
})
export class DetailViewPageComponent {

  private krameriusBaseUrl: string;

  public detailViewService = inject(DetailViewService);

  public recordHandler = inject(RecordHandlerService);

  constructor(private envService: EnvironmentService) {
    this.krameriusBaseUrl = this.envService.get('krameriusBaseUrl');
  }

  ngOnInit() {
    this.detailViewService.loadDocument();
    this.detailViewService.loadPages();
  }

  goBackClicked() {
    window.history.back();
  }

  keydownHandler(event: KeyboardEvent) {
    switch (event.key) {
      case 'Escape': {
        this.detailViewService.openRecordInfo();
        break;
      }
      case 'ArrowLeft': {
        this.detailViewService.goToPrevious();
        break;
      }
      case 'ArrowRight': {
        this.detailViewService.goToNext();
        break;
      }
      case 'ArrowUp': {
        // go -3 pages
        this.detailViewService.goToPrevious(3);
        break;
      }
      case 'ArrowDown': {
        // go +3 pages
        this.detailViewService.goToNext(3);
        break;
      }
      case 'Enter': {
        this.detailViewService.openRecordInfo();
        break;
      }
      default: {
        // Do nothing
      }
    }
  }



  getKrameriusBaseUrl(): string {
    return this.krameriusBaseUrl;
  }

  protected readonly DocumentTypeEnum = DocumentTypeEnum;
}
