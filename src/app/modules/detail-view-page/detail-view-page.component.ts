import {Component, inject} from '@angular/core';
import { EnvironmentService } from '../../shared/services/environment.service';
import {DetailViewService} from './services/detail-view.service';
import {RecordHandlerService} from '../../shared/services/record-handler.service';
import {DocumentTypeEnum} from '../constants/document-type';
import {AdminSelectionService} from '../../shared/services';

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
  public adminSelectionService = inject(AdminSelectionService);

  constructor(private envService: EnvironmentService) {
    this.krameriusBaseUrl = this.envService.get('krameriusBaseUrl');
  }

  ngOnInit() {
    this.detailViewService.loadDocument();
    // this.detailViewService.loadPages();
  }

  goBackClicked() {
    window.history.back();
  }

  getKrameriusBaseUrl(): string {
    return this.krameriusBaseUrl;
  }

  protected readonly DocumentTypeEnum = DocumentTypeEnum;
}
