import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { InlineLoaderComponent } from '../../shared/components/inline-loader/inline-loader.component';
import { EnvironmentService } from '../../shared/services/environment.service';
import { DetailViewService } from './services/detail-view.service';
import { RecordHandlerService } from '../../shared/services/record-handler.service';
import { DocumentTypeEnum } from '../constants/document-type';
import { DocumentAccessibilityEnum } from '../constants/document-accessibility';
import { SelectionService } from '../../shared/services';
import { Subscription } from 'rxjs';
import { PdfService } from '../../shared/services/pdf.service';
import { IIIFViewerService } from '../../shared/services/iiif-viewer.service';
import { ViewToggleOption } from '../../shared/components/toolbar-controls/toolbar-controls.component';
import { FavoritesService } from '../../shared/services/favorites.service';
import { PopupPositioningService } from '../../shared/services/popup-positioning.service';
import { Router } from '@angular/router';
import { FavoritesPopupHelper } from '../../shared/helpers/favorites-popup.helper';

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

  // Favorites popup helper
  public favoritesHelper: FavoritesPopupHelper;

  // View toggle options for sound recordings - static to prevent re-rendering
  readonly viewToggleOptions: ViewToggleOption[] = [
    { label: 'Nahrávky', icon: 'icon-music-filter', value: 'records' },
    { label: 'Obrázky', icon: 'icon-gallery', value: 'images' }
  ];

  constructor(
    private envService: EnvironmentService,
    favoritesService: FavoritesService,
    popupPositioning: PopupPositioningService,
    router: Router
  ) {
    this.krameriusBaseUrl = this.envService.getKrameriusUrl();
    this.favoritesHelper = new FavoritesPopupHelper(favoritesService, popupPositioning, router);
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
    this.favoritesHelper.cleanup();
  }

  toggleAdminMode(): void {
    this.selectionService.toggleSelectionMode();
  }

  goBackClicked() {
    window.history.back();
  }

  onFavoritesClicked(event: Event) {
    // Enable hierarchy selector for detail view (not for music pages)
    this.favoritesHelper.onFavoritesClicked(event, this.detailViewService.document$, true);
  }

  onFavoritesPopupClose() {
    this.favoritesHelper.onFavoritesPopupClose();
  }

  getKrameriusBaseUrl(): string {
    return this.krameriusBaseUrl;
  }

  protected readonly DocumentTypeEnum = DocumentTypeEnum;
}
