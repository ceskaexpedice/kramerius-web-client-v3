import {Component, inject, Input, Output, EventEmitter, OnChanges, OnDestroy, SimpleChanges, signal} from '@angular/core';
import { SearchDocument } from '../../../modules/models/search-document';
import { TranslatePipe } from '@ngx-translate/core';
import { AsyncPipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { EMPTY, Observable, shareReplay } from 'rxjs';
import { AccessibilityBadgeComponent } from '../accessibility-badge/accessibility-badge.component';
import { CheckboxComponent } from '../checkbox/checkbox.component';
import { EnvironmentService } from '../../services/environment.service';
import { LanguageBadgeComponent } from '../language-badge/language-badge.component';
import {RecordHandlerService} from '../../services/record-handler.service';
import { AdminModeService } from '../../services';
import { PluralizePipe } from '../../pipes/pluralize.pipe';
import { TableColumnConfig, ColumnRenderType } from '../../models/display-config.model';
import { ThumbnailImageComponent } from '../thumbnail-image/thumbnail-image.component';
import {ModelBadgeComponent} from '../model-badge/model-badge.component';
import { ConfigService } from '../../../core/config';
import { FavoritesPopupComponent } from '../favorites-popup/favorites-popup.component';
import { CdkTooltipDirective } from '../../directives/cdk-tooltip/cdk-tooltip.directive';
import { FavoritesService } from '../../services/favorites.service';
import { PopupPositioningService, PopupState } from '../../services/popup-positioning.service';
import { FolderItemsService } from '../../../modules/saved-lists-page/services/folder-items.service';
import { SavedListsService } from '../../../modules/saved-lists-page/services/saved-lists.service';

@Component({
  selector: 'tr[app-record-item-list-row]',
  imports: [
    TranslatePipe,
    NgIf,
    NgForOf,
    AccessibilityBadgeComponent,
    CheckboxComponent,
    PluralizePipe,
    ThumbnailImageComponent,
    LanguageBadgeComponent,
    ModelBadgeComponent,
    AsyncPipe,
    NgClass,
    FavoritesPopupComponent,
    CdkTooltipDirective,
  ],
  templateUrl: './record-item-list-row.component.html',
  styleUrl: './record-item-list-row.component.scss',
  host: {
    '[class.selection-mode]': 'adminModeService.adminMode()',
    '[class.selected]': 'adminModeService.adminMode() && record && adminModeService.isSelected(record.pid)',
    '[class.highlighted]': 'highlighted',
    '[class.skeleton-row]': 'loading',
    '(click)': 'onRowClick($event)'
  }
})
export class RecordItemListRowComponent implements OnChanges, OnDestroy {

  @Input() record: SearchDocument | null = null;
  @Input() url!: string;
  @Input() visibleColumns: TableColumnConfig[] = [];
  @Input() highlighted = false;
  @Input() loading = false;
  @Input() currentFolderId?: string;

  @Output() downloadClicked = new EventEmitter<SearchDocument>();

  recordHandler = inject(RecordHandlerService);
  public adminModeService = inject(AdminModeService);
  private configService = inject(ConfigService);
  private favoritesService = inject(FavoritesService);
  private folderItemsService = inject(FolderItemsService);
  private savedListsService = inject(SavedListsService);
  private popupPositioning = inject(PopupPositioningService);
  private router = inject(Router);

  // Same heart / trash (my library) actions as the grid card. The heart opens
  // the favorites popup in 'add' mode; the trash is shown for records in one of
  // the user's own folders — one folder removes right away, several open the
  // popup in 'remove' mode.
  isItemFavorited$: Observable<boolean> = EMPTY;
  itemFolderIds$: Observable<string[]> = EMPTY;
  favoritesPopupState: PopupState = this.favoritesService.createPopupState();
  popupMode = signal<'add' | 'remove'>('add');

  // Hide the export trigger entirely when the instance offers no export formats.
  exportEnabled = this.configService.isAnyExportFormatEnabled();

  protected readonly ColumnRenderType = ColumnRenderType;

  private krameriusBaseUrl: string;

  constructor(private envService: EnvironmentService) {
    this.krameriusBaseUrl = this.envService.getApiUrl('items');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['record']) {
      const pid = this.record?.pid;
      this.isItemFavorited$ = pid
        ? this.favoritesService.getFavoritedStatus(pid)
            .pipe(shareReplay({ bufferSize: 1, refCount: true }))
        : EMPTY;
      this.itemFolderIds$ = pid
        ? this.folderItemsService.getOwnedFolderIdsContainingItem(pid)
            .pipe(shareReplay({ bufferSize: 1, refCount: true }))
        : EMPTY;
    }
  }

  ngOnDestroy(): void {
    this.popupPositioning.cleanup();
  }

  onToggleFavorites(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.record) return;

    this.popupMode.set('add');
    this.favoritesService.handleFavoriteToggle(this.router.url, event, this.favoritesPopupState);
  }

  onRemoveFromFolder(event: Event, folderIds: string[]): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.record || folderIds.length === 0) return;

    if (folderIds.length === 1) {
      this.savedListsService.removeItemFromFolder(folderIds[0], this.record.pid, this.getDisplayTitle());
      return;
    }

    this.popupMode.set('remove');
    this.favoritesService.handleFavoriteToggle(this.router.url, event, this.favoritesPopupState);
  }

  getKrameriusBaseUrl(): string {
    if (!this.record) return '';
    return this.krameriusBaseUrl + '/' + this.record.pid + '/image/thumb';
  }

  /**
   * Gets the value for a column from the record
   */
  getColumnValue(column: TableColumnConfig): any {
    if (!this.record) return '';
    return (this.record as any)[column.field];
  }

  /**
   * Formats an array field for display
   */
  formatArrayValue(value: string[] | undefined, maxLength: number = 50): string {
    if (!value || value.length === 0) {
      return '—';
    }

    const joined = value.join(', ');
    if (joined.length > maxLength) {
      return joined.slice(0, maxLength) + '...';
    }
    return joined;
  }

  /**
   * Formats author array
   */
  formatAuthors(authors: string[] | undefined): string {
    if (!authors || authors.length === 0) {
      return '';
    }

    const joined = authors.join(', ');
    if (joined.length > 35) {
      return joined.slice(0, 35) + '...';
    }
    return joined;
  }

  onRowClick(event: MouseEvent): void {
    if (this.loading || !this.record) return;
    // This handles clicks on the entire row (when in selection mode)
    if (this.adminModeService.adminMode()) {
      event.preventDefault();
      this.adminModeService.toggleItem(this.record.pid);
    }
    // In normal mode, row clicks don't do anything (let individual elements handle their clicks)
  }

  onTitleClick(event: MouseEvent): void {
    if (!this.record) return;
    // This handles clicks specifically on the title/link area
    if (this.adminModeService.adminMode()) {
      event.preventDefault();
      this.adminModeService.toggleItem(this.record.pid);
    } else {
      this.recordHandler.onNavigate(event, this.url);
    }
  }

  getDisplayTitle(): string {
    if (!this.record) return '';
    return this.record.title || this.record.rootTitle || '';
  }

  onSelectionChange(selected: boolean): void {
    if (!this.record) return;
    if (selected) {
      this.adminModeService.selectItem(this.record.pid);
    } else {
      this.adminModeService.deselectItem(this.record.pid);
    }
  }
}
