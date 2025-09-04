import {Component, inject, OnInit, OnDestroy} from '@angular/core';
import { EnvironmentService } from '../../shared/services/environment.service';
import {DetailViewService} from './services/detail-view.service';
import {RecordHandlerService} from '../../shared/services/record-handler.service';
import {DocumentTypeEnum} from '../constants/document-type';
import {DocumentAccessibilityEnum} from '../constants/document-accessibility';
import {AdminSelectionService} from '../../shared/services';
import {Subscription} from 'rxjs';

@Component({
  selector: 'app-detail-view-page',
  templateUrl: './detail-view-page.component.html',
  styleUrl: './detail-view-page.component.scss',
  standalone: false
})
export class DetailViewPageComponent implements OnInit, OnDestroy {

  private krameriusBaseUrl: string;
  private subscriptions: Subscription[] = [];

  public detailViewService = inject(DetailViewService);
  public recordHandler = inject(RecordHandlerService);
  public adminSelectionService = inject(AdminSelectionService);

  constructor(private envService: EnvironmentService) {
    this.krameriusBaseUrl = this.envService.get('krameriusBaseUrl');
  }

  ngOnInit() {
    this.detailViewService.loadDocument();
    // this.detailViewService.loadPages();

    // Set up admin selection service to track current page items
    this.subscriptions.push(
      this.detailViewService.pages$.subscribe(pages => {
        if (pages && pages.length > 0) {
          const pageItems = pages.map(page => ({
            pid: page.pid,
            title: `Page ${pages.indexOf(page) + 1}`,
            model: DocumentTypeEnum.page,
            accessibility: DocumentAccessibilityEnum.PUBLIC,
            licenses: [],
            access: 'public'
          }));
          this.adminSelectionService.updateCurrentPageItems(pageItems);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  toggleAdminMode(): void {
    this.adminSelectionService.toggleAdminMode();
  }

  goBackClicked() {
    window.history.back();
  }

  getKrameriusBaseUrl(): string {
    return this.krameriusBaseUrl;
  }

  protected readonly DocumentTypeEnum = DocumentTypeEnum;
}
