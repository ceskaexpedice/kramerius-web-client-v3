import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { InlineLoaderComponent } from '../../shared/components/inline-loader/inline-loader.component';
import { EnvironmentService } from '../../shared/services/environment.service';
import { DetailViewService } from './services/detail-view.service';
import { RecordHandlerService } from '../../shared/services/record-handler.service';
import { DocumentTypeEnum } from '../constants/document-type';
import { DocumentAccessibilityEnum } from '../constants/document-accessibility';
import { SelectionService } from '../../shared/services';
import { Observable, Subscription } from 'rxjs';
import { map, shareReplay, distinctUntilChanged } from 'rxjs/operators';
import { PdfService } from '../../shared/services/pdf.service';
import { IIIFViewerService } from '../../shared/services/iiif-viewer.service';
import { ViewToggleOption } from '../../shared/components/toolbar-controls/toolbar-controls.component';
import { FavoritesService } from '../../shared/services/favorites.service';
import { PopupPositioningService } from '../../shared/services/popup-positioning.service';
import { Router } from '@angular/router';
import { FavoritesPopupHelper } from '../../shared/helpers/favorites-popup.helper';
import { Store } from '@ngrx/store';
import { selectArticleDetail } from '../../shared/state/document-detail/document-detail.selectors';
import { fromSolrToMetadata } from '../../shared/models/metadata.model';
import { DocumentInfoService } from '../../shared/services/document-info.service';

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
  public documentInfoService = inject(DocumentInfoService);
  public translate = inject(TranslateService);
  private store = inject(Store);

  // Favorites popup helper
  public favoritesHelper: FavoritesPopupHelper;

  // Article detail observable - converted to metadata format
  articleMetadata$: Observable<any>;

  // View toggle options for sound recordings - static to prevent re-rendering
  readonly viewToggleOptions: ViewToggleOption[] = [
    { label: 'sound-records--toggle', icon: 'icon-music-filter', value: 'records' },
    { label: 'images--toggle', icon: 'icon-gallery', value: 'images' }
  ];

  constructor(
    private envService: EnvironmentService,
    favoritesService: FavoritesService,
    popupPositioning: PopupPositioningService,
    router: Router
  ) {
    this.krameriusBaseUrl = this.envService.getKrameriusUrl();
    this.favoritesHelper = new FavoritesPopupHelper(favoritesService, popupPositioning, router);

    this.articleMetadata$ = this.store.select(selectArticleDetail).pipe(
      distinctUntilChanged((prev, curr) => prev?.pid === curr?.pid),
      map(articleDetail => {
        if (articleDetail) {
          const metadata = fromSolrToMetadata(articleDetail);
          console.log('New article metadata loaded - UUID:', metadata?.uuid);
          // Return new object reference to force change detection
          return { ...metadata };
        }
        console.log('Article metadata cleared');
        return null;
      }),
      shareReplay(1)
    );
  }

  ngOnInit() {
    this.documentInfoService.reset();
    this.detailViewService.loadDocument();

    this.subscriptions.push(
      this.detailViewService.pages$.subscribe(pages => {
        if (pages && pages.length > 0) {
          const pageItems = pages.map(page => ({
            pid: page.pid,
            title: `${this.translate.instant('page')} ${pages.indexOf(page) + 1}`,
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
    this.detailViewService.resetState();
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
