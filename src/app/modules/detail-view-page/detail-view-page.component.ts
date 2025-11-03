import {Component, inject, OnInit, OnDestroy} from '@angular/core';
import { EnvironmentService } from '../../shared/services/environment.service';
import {DetailViewService} from './services/detail-view.service';
import {RecordHandlerService} from '../../shared/services/record-handler.service';
import {DocumentTypeEnum} from '../constants/document-type';
import {DocumentAccessibilityEnum} from '../constants/document-accessibility';
import {SelectionService} from '../../shared/services';
import {Subscription} from 'rxjs';
import {PdfService} from '../../shared/services/pdf.service';
import {IIIFViewerService} from '../../shared/services/iiif-viewer.service';
import {ViewToggleOption} from '../../shared/components/toolbar-controls/toolbar-controls.component';

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
  public selectionService = inject(SelectionService);
  public pdfService = inject(PdfService);
  public iiifViewerService = inject(IIIFViewerService);

  // View toggle options for sound recordings - static to prevent re-rendering
  readonly viewToggleOptions: ViewToggleOption[] = [
    { label: 'Nahrávky', icon: 'icon-music-filter', value: 'records' },
    { label: 'Obrázky', icon: 'icon-gallery', value: 'images' }
  ];

  constructor(private envService: EnvironmentService) {
    this.krameriusBaseUrl = this.envService.getKrameriusUrl();
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
          this.selectionService.updateCurrentPageItems(pageItems);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  toggleAdminMode(): void {
    this.selectionService.toggleSelectionMode();
  }

  goBackClicked() {
    window.history.back();
  }

  getKrameriusBaseUrl(): string {
    return this.krameriusBaseUrl;
  }

  protected readonly DocumentTypeEnum = DocumentTypeEnum;
}
