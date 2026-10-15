import { ChangeDetectionStrategy, Component, inject, Input, OnChanges, OnDestroy, signal, SimpleChanges } from '@angular/core';
import { AsyncPipe, NgClass, NgIf } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { RecordHandlerService } from '../../services/record-handler.service';
import { DocumentTypeEnum } from '../../../modules/constants/document-type';
import { SolrService } from '../../../core/solr/solr.service';
import { AccessibilityBadgeComponent } from '../accessibility-badge/accessibility-badge.component';
import { FavoritesPopupComponent } from '../favorites-popup/favorites-popup.component';
import { PopupPositioningService, PopupState } from '../../services/popup-positioning.service';
import { AdminModeService } from '../../services';
import { CheckboxComponent } from '../checkbox/checkbox.component';
import { Observable, EMPTY, take, shareReplay } from 'rxjs';
import { SavedListsService } from '../../../modules/saved-lists-page/services/saved-lists.service';
import { EnvironmentService } from '../../services/environment.service';
import { RecordItem } from './record-item.model';
import { FavoritesService } from '../../services/favorites.service';
import { FolderItemsService } from '../../../modules/saved-lists-page/services/folder-items.service';
import { ModelBadgeComponent } from '../model-badge/model-badge.component';
import { getLocalizedField } from '../../utils/language-utils';
import { Metadata, fromSolrToMetadata } from '../../models/metadata.model';
import { ThumbnailImageComponent } from '../thumbnail-image/thumbnail-image.component';
import { SlideUpPanelComponent } from '../slide-up-panel/slide-up-panel.component';
import { MetadataSection } from '../metadata-section/metadata-section';
import { PluralizePipe } from '../../pipes/pluralize.pipe';
import { CdkTooltipDirective } from '../../directives/cdk-tooltip/cdk-tooltip.directive';
import { trimSnippetToHighlight } from '../../utils/highlight-snippet';

@Component({
  selector: 'app-record-item',
  imports: [
    AsyncPipe,
    TranslatePipe,
    AccessibilityBadgeComponent,
    FavoritesPopupComponent,
    CheckboxComponent,
    NgClass,
    NgIf,
    ModelBadgeComponent,
    ThumbnailImageComponent,
    SlideUpPanelComponent,
    MetadataSection,
    PluralizePipe,
    CdkTooltipDirective,
  ],
  templateUrl: './record-item.component.html',
  styleUrl: './record-item.component.scss',
  // OnPush: result grids render up to 180 of these at once (and several
  // sections at the same time on the search page). Its inputs are replaced
  // rather than mutated, its local state is signal-based (popup state, info
  // sheet) and the rest of the template reads signals or async pipes, all of
  // which mark the view dirty on their own.
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordItemComponent implements OnChanges, OnDestroy {

  recordHandler = inject(RecordHandlerService);
  solrService = inject(SolrService);
  favoritesService = inject(FavoritesService);
  private folderItemsService = inject(FolderItemsService);
  popupPositioning = inject(PopupPositioningService);
  public adminModeService = inject(AdminModeService);
  private savedListsService = inject(SavedListsService);
  private envService = inject(EnvironmentService);
  private translateService = inject(TranslateService);

  private krameriusBaseUrl: string;

  @Input() showModel = true;
  @Input() showPageTag = true;
  @Input() layout: 'auto' | 'vertical' | 'horizontal' = 'auto';
  @Input() variant: 'default' | 'portrait' = 'default';
  @Input() showAccessibilityBadge = true;
  @Input() loading = false;

  @Input() item: RecordItem | null | undefined = {
    id: '',
    title: '',
    model: '',
    licenses: [],
    className: '',
    showFavoriteButton: true,
    showAccessibilityBadge: false
  };
  @Input() currentFolderId?: string;
  // Free-text term to re-run inside the opened document (e.g. the active folder
  // or search query). When set, the detail link carries ?fulltext= so the
  // in-document search restores automatically on the detail view.
  @Input() fulltextOverride?: string | null;

  // Mobile info bottom sheet
  infoSheetOpen = signal(false);
  infoSheetMetadata = signal<Metadata | null>(null);

  router = inject(Router);

  favoritesPopupState: PopupState;

  // Observable to check if this item is in any folder
  isItemFavorited$: Observable<boolean> = EMPTY;

  // IDs of the user's OWN folders that currently contain this item. Drives the
  // trash (remove) action: shown whenever the item is in at least one owned
  // folder (followed/shared folders aren't editable, so an item only in those
  // gets no trash). When it is in exactly one we remove immediately; when it is
  // in several we open the favorites popup in 'remove' mode so the user picks
  // which to remove from. Derived from the mapping, so it works anywhere (not
  // only the saved-lists page where currentFolderId is set).
  itemFolderIds$: Observable<string[]> = EMPTY;

  // Opens the favorites popup in remove mode instead of the default add mode.
  popupMode = signal<'add' | 'remove'>('add');

  constructor() {
    this.favoritesPopupState = this.favoritesService.createPopupState();
    this.krameriusBaseUrl = this.envService.getApiUrl('items');
  }

  ngOnChanges(changes: SimpleChanges) {
    // (Re)initialize the observables whenever the item's id changes. This can't
    // be a one-shot ngOnInit: grids render skeleton cards (item = null) first and
    // track by $index, so the same instance later receives the real item — with
    // ngOnInit the heart/trash streams stayed EMPTY for every such card.
    //
    // shareReplay is what keeps result grids affordable: the template subscribes
    // to isItemFavorited$ six times (favourite button class, icon, and the same
    // pair again in the horizontal layout) and each subscription otherwise ran
    // its own store.select + a full scan of the folder mapping on every store
    // emission. At a 180-item page size that was ~1000 scans per emission.
    if (!changes['item']) return;
    const prevId = (changes['item'].previousValue as RecordItem | null | undefined)?.id;
    if (!changes['item'].firstChange && prevId === this.item?.id) return;

    this.isItemFavorited$ = EMPTY;
    this.itemFolderIds$ = EMPTY;
    if (this.item?.id) {
      this.isItemFavorited$ = this.favoritesService.getFavoritedStatus(this.item!.id)
        .pipe(shareReplay({ bufferSize: 1, refCount: true }));
      this.itemFolderIds$ = this.folderItemsService.getOwnedFolderIdsContainingItem(this.item!.id)
        .pipe(shareReplay({ bufferSize: 1, refCount: true }));
    }
  }

  onRecordClick(e: MouseEvent): void {
    if (!this.item) return;
    if (this.adminModeService.adminMode()) {
      e.preventDefault();
      this.adminModeService.toggleItem(this.item.id);
    } else if (this.item.externalUrl) {

    } else {
      this.recordHandler.onNavigate(e, this.getDocumentUrl());
    }
  }

  onSelectionChange(selected: boolean): void {
    if (!this.item) return;
    if (selected) {
      this.adminModeService.selectItem(this.item.id);
    } else {
      this.adminModeService.deselectItem(this.item.id);
    }
  }

  getImageThumbnailUrl(): string {
    if (!this.item) return '';
    if (this.item.imageUrl) {
      return this.item.imageUrl;
    }
    // Use Kramerius API for thumbnail
    return this.krameriusBaseUrl + '/' + this.item.id + '/image/thumb';
  }

  getDocumentUrl(): string {
    if (!this.item) return '';
    if (this.item.externalUrl) {
      return this.item.externalUrl;
    }
    return this.recordHandler.getDocumentUrl({
      model: this.item.model,
      pid: this.item.id,
      ownParentPid: this.item.ownParentPid,
      ownParentModel: this.item.ownParentModel,
      fulltext: this.item.fulltext,
      fulltextForDocument: this.fulltextOverride,
      grouped: this.item.grouped,
    });
  }

  /**
   * Re-centers an OCR snippet on its first match. `.text-ocr` clamps to 4 lines
   * and Solr fragments run longer than that, so without this the searched term
   * frequently landed in the clipped overflow instead of on the card.
   */
  getOcrSnippet(text: string): string {
    return trimSnippetToHighlight(text, OCR_SNIPPET_VISIBLE_CHARS);
  }

  getTitle(): string {
    // Collections carry localized title fields; resolve per current language at
    // render time so the card title follows language changes (like the description).
    if (this.item?.model === DocumentTypeEnum.collection) {
      const localized = getLocalizedField(this.item, 'title.search', this.translateService.getCurrentLang());
      if (localized) return localized;
    }
    return this.item?.title || '';
  }

  getSubtitle(): string {
    // Periodical volumes read e.g. "Ročník 1": the localized model label followed
    // by the volume number (from `part.number.sort`). Resolved at render time so it
    // follows language changes, like the title/collection handling above.
    if (this.item?.model === DocumentTypeEnum.periodicalvolume && this.item.partNumber != null) {
      const label = this.translateService.instant(DocumentTypeEnum.periodicalvolume);
      return `${label} ${this.item.partNumber}`;
    }
    return this.item?.subtitle || '';
  }

  onToggleFavorites(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.item) return;

    if (this.item.showFavoriteButton === false) return;

    this.popupMode.set('add');

    // Handle favorite toggle with authentication check
    this.favoritesService.handleFavoriteToggle(
      this.router.url,
      event,
      this.favoritesPopupState
    );
  }

  ngOnDestroy() {
    // Clean up popup positioning service
    this.popupPositioning.cleanup();
  }

  onRemoveFromFolder(event: Event, folderIds: string[]) {
    event.preventDefault();
    event.stopPropagation();

    // folderIds are already limited to the user's own folders.
    if (!this.item || folderIds.length === 0) return;

    // In a single owned folder: remove right away (with the standard confirmation).
    if (folderIds.length === 1) {
      this.savedListsService.removeItemFromFolder(
        folderIds[0],
        this.item.id,
        this.item.title,
        () => {}
      );
      return;
    }

    // In several owned folders: open the popup in remove mode so the user picks
    // which folders to remove the item from.
    this.popupMode.set('remove');
    this.favoritesService.handleFavoriteToggle(
      this.router.url,
      event,
      this.favoritesPopupState
    );
  }

  onInfoClick(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    if (!this.item) return;

    this.solrService.getDetailItem(this.item.id).pipe(take(1)).subscribe(solrDoc => {
      if (solrDoc) {
        this.infoSheetMetadata.set(fromSolrToMetadata(solrDoc));
      }
      this.infoSheetOpen.set(true);
    });
  }

  // Helper methods
  isRecordLocked(): boolean {
    if (!this.item) return false;
    return this.recordHandler.isRecordLocked(this.item.licenses || []);
  }

  shouldShowAccessibilityBadge(): boolean {
    if (!this.item) return false;
    return this.item.showAccessibilityBadge === true && this.showAccessibilityBadge;
  }

  shouldShowFavoriteButton(): boolean {
    if (!this.item) return false;
    return this.item.showFavoriteButton !== false && !this.adminModeService.adminMode();
  }

  getLocalizedCollectionDescription() {
    const text = getLocalizedField(this.item, 'collection.desc', this.translateService.getCurrentLang());

    return text;
  }

  protected readonly DocumentTypeEnum = DocumentTypeEnum;
}

/**
 * What the 4-line `.text-ocr` clamp actually shows on a card. Measured in the
 * running app: the box is ~131px wide at 14px/20px, which fits ~71 characters
 * over its four lines. Kept a little under that — the trim keeps a quarter of
 * the budget as lead-in context, so the match lands well inside the clamp even
 * where a wider card or a larger text scale shifts the exact character count.
 */
const OCR_SNIPPET_VISIBLE_CHARS = 70;
