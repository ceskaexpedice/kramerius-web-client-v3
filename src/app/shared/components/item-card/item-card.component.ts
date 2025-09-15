import {Component, inject, Input, OnInit, OnDestroy} from '@angular/core';
import { NgClass, NgIf, AsyncPipe } from '@angular/common';
import { AccessibilityBadgeComponent } from '../accessibility-badge/accessibility-badge.component';
import { DocumentAccessibilityEnum } from '../../../modules/constants/document-accessibility';
import { EnvironmentService } from '../../services/environment.service';
import {RecordHandlerService} from '../../services/record-handler.service';
import {Router} from '@angular/router';
import { SelectionService } from '../../services';
import { CheckboxComponent } from '../checkbox/checkbox.component';
import { FolderItemsService } from '../../../modules/saved-lists-page/services/folder-items.service';
import { FavoritesPopupComponent } from '../favorites-popup/favorites-popup.component';
import { PopupPositioningService, PopupState } from '../../services/popup-positioning.service';
import { AuthService } from '../../../core/auth/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { LoginPromptDialogComponent } from '../../dialogs/login-prompt-dialog/login-prompt-dialog.component';
import { Observable, EMPTY } from 'rxjs';

export interface ItemCard {
  uuid: string;
  title: string;
  subtitle?: string;
  model: string;
}

@Component({
  selector: 'app-item-card',
  imports: [
    NgIf,
    AsyncPipe,
    AccessibilityBadgeComponent,
    NgClass,
    CheckboxComponent,
    FavoritesPopupComponent,
  ],
  templateUrl: './item-card.component.html',
  styleUrl: './item-card.component.scss'
})
export class ItemCardComponent implements OnInit, OnDestroy {
  @Input() uuid!: string;
  @Input() title!: string;
  @Input() subtitle?: string;
  @Input() model: string = '';
  @Input() link: string | null = null;
  @Input() accessibility: DocumentAccessibilityEnum = DocumentAccessibilityEnum.PUBLIC;
  @Input() licenses: string[] = [];
  @Input() className?: string = '';

  @Input() showFavoriteButton: boolean = true;
  @Input() showAccessibilityBadge: boolean = false;

  private krameriusBaseUrl: string;

  public recordHandlerService = inject(RecordHandlerService);
  private router = inject(Router);
  public selectionService = inject(SelectionService);
  private folderItemsService = inject(FolderItemsService);
  private popupPositioning = inject(PopupPositioningService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);

  // Observable to check if this item is in any folder
  isItemFavorited$: Observable<boolean> = EMPTY;

  favoritesPopupState: PopupState;

  constructor(private envService: EnvironmentService) {
    this.krameriusBaseUrl = this.envService.getApiUrl('items');
    this.favoritesPopupState = this.popupPositioning.createPopupState();
  }

  ngOnInit() {
    // Initialize the observable once we have the uuid
    if (this.uuid) {
      this.isItemFavorited$ = this.folderItemsService.isItemInAnyFolder(this.uuid);
    }
  }

  ngOnDestroy() {
    // Clean up popup positioning service
    this.popupPositioning.cleanup();
  }

  toggleFavorite(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.showFavoriteButton) return;

    // Check if user is authenticated
    if (!this.authService.hasValidToken()) {
      // Show login prompt dialog
      const dialogRef = this.dialog.open(LoginPromptDialogComponent, {
        width: '60vw',
        disableClose: false
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result === 'login') {
          // Redirect to login with current route as return URL
          this.authService.login(this.router.url);
        }
      });
      return;
    }

    // User is authenticated, show favorites popup
    this.popupPositioning.showPopup(this.favoritesPopupState, {
      triggerEvent: event,
      popupWidth: 265,
      popupHeight: 400,
      preferredSide: 'right'
    });
  }

  getKrameriusBaseUrl(): string {
    return this.krameriusBaseUrl + '/' + this.uuid + '/image/thumb';
  }


  onSelectionChange(selected: boolean): void {
    if (selected) {
      this.selectionService.selectItem(this.uuid);
    } else {
      this.selectionService.deselectItem(this.uuid);
    }
  }

  onCardClick(event: MouseEvent): void {
    if (this.selectionService.selectionMode()) {
      event.preventDefault();
      this.selectionService.toggleItem(this.uuid);
    } else {
      this.recordHandlerService.onNavigate(event, this.recordHandlerService.getHandleDocumentUrlByModelAndPid(this.model, this.uuid));
    }
  }

  protected readonly DocumentAccessibilityEnum = DocumentAccessibilityEnum;
}
