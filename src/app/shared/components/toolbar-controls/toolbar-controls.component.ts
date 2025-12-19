import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, effect, inject } from '@angular/core';
import { NgClass, NgForOf, NgIf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { UserService } from '../../services/user.service';

export type CalendarGridControl = 'calendar' | 'grid';
export type SoundRecordGridControl = 'records' | 'images';

export interface ViewToggleOption {
  label: string;
  icon: string;
  value: string;
}

export interface ToolbarAction {
  id: string;
  icon: string;
  tooltip?: string;
  disabled?: boolean;
  visible?: boolean;
  label?: string;
}

export interface ToolbarActionEvent {
  id: string;
  action: ToolbarAction;
}

@Component({
  selector: 'app-toolbar-controls',
  imports: [
    NgIf,
    NgForOf,
    TranslatePipe,
    NgClass,
  ],
  templateUrl: './toolbar-controls.component.html',
  styleUrl: './toolbar-controls.component.scss'
})
export class ToolbarControlsComponent implements OnChanges {

  @Input() showViewToggle = false;
  @Input() viewToggleOptions: ViewToggleOption[] = [];
  @Input() activeViewValue: string | null = null;

  // New configuration-based approach
  @Input() actions: ToolbarAction[] = [];
  @Output() actionClicked: EventEmitter<ToolbarActionEvent> = new EventEmitter<ToolbarActionEvent>();

  // Legacy boolean inputs - maintained for backward compatibility
  @Input() showFavorites = false;
  @Input() showShare = false;
  @Input() showQuote = false;
  @Input() showInfo = false;
  @Input() showDelete = false;
  @Input() showDownload = false;
  @Input() showEdit = false;
  @Input() showSelect = false;
  @Input() themeDefault = false;

  // Legacy outputs - maintained for backward compatibility
  @Output() favoritesClicked: EventEmitter<any> = new EventEmitter<any>();
  @Output() shareClicked: EventEmitter<any> = new EventEmitter<any>();
  @Output() quoteClicked: EventEmitter<any> = new EventEmitter<any>();
  @Output() infoClicked: EventEmitter<any> = new EventEmitter<any>();
  @Output() deleteClicked: EventEmitter<any> = new EventEmitter<any>();
  @Output() downloadClicked: EventEmitter<any> = new EventEmitter<any>();
  @Output() editClicked: EventEmitter<any> = new EventEmitter<any>();
  @Output() selectClicked: EventEmitter<any> = new EventEmitter<any>();
  @Output() viewChanged = new EventEmitter<string>();

  // Memoized merged actions - only recalculated when inputs change
  mergedActions: ToolbarAction[] = [];

  private userService = inject(UserService);

  constructor() {
    effect(() => {
      // Re-run update when user permissions change
      this.userService.userSession$();
      this.updateMergedActions();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Recalculate mergedActions only when relevant inputs change
    if (changes['actions'] || changes['showInfo'] || changes['showFavorites'] ||
      changes['showShare'] || changes['showQuote'] || changes['showDelete'] ||
      changes['showDownload'] || changes['showEdit'] || changes['showSelect']) {
      this.updateMergedActions();
    }
  }

  private updateMergedActions(): void {
    const configActions = this.actions.filter(action => action.visible !== false);

    // Legacy boolean actions converted to config format
    const legacyActions: ToolbarAction[] = [];

    if (this.showInfo) {
      legacyActions.push({ id: 'info', icon: 'icon-info', tooltip: 'Information', label: 'Info' });
    }
    if (this.showFavorites) {
      legacyActions.push({ id: 'favorites', icon: 'icon-heart', tooltip: 'Add to Favorites', label: 'Favorites' });
    }
    if (this.showShare) {
      legacyActions.push({ id: 'share', icon: 'icon-send-2', tooltip: 'Share', label: 'Share' });
    }
    if (this.showQuote) {
      legacyActions.push({ id: 'quote', icon: 'icon-quote-down', tooltip: 'Quote', label: 'Quote' });
    }
    if (this.showDelete) {
      legacyActions.push({ id: 'delete', icon: 'icon-trash', tooltip: 'Delete', label: 'Delete' });
    }
    if (this.showDownload) {
      legacyActions.push({ id: 'download', icon: 'icon-download', tooltip: 'Download', label: 'Download' });
    }
    if (this.showEdit) {
      legacyActions.push({ id: 'edit', icon: 'icon-tick-square', tooltip: 'Edit', label: 'Edit' });
    }

    if (this.showSelect && this.userService.isLoggedIn && this.userService.isAdmin) {
      legacyActions.push({ id: 'select', icon: 'icon-tick-square', tooltip: 'Select', disabled: false, label: 'Select' });
    }

    // Combine both sets of actions
    this.mergedActions = [...configActions, ...legacyActions];
  }

  // TrackBy function for *ngFor to help Angular track button identity
  trackByActionId(index: number, action: ToolbarAction): string {
    return action.id;
  }

  onToggle(option: ViewToggleOption): void {
    this.activeViewValue = option.value;
    this.viewChanged.emit(option.value);
  }

  // New configuration-based action handler
  onActionClick(action: ToolbarAction, event: Event): void {
    if (action.disabled) return;

    // Emit new event
    this.actionClicked.emit({ id: action.id, action });

    // Maintain backward compatibility by also emitting legacy events
    switch (action.id) {
      case 'info':
        this.infoClicked.emit();
        break;
      case 'favorites':
        this.favoritesClicked.emit(event);
        break;
      case 'share':
        this.shareClicked.emit();
        break;
      case 'quote':
        this.quoteClicked.emit();
        break;
      case 'delete':
        this.deleteClicked.emit();
        break;
      case 'download':
        this.downloadClicked.emit();
        break;
      case 'edit':
        this.editClicked.emit();
        break;
      case 'select':
        this.selectClicked.emit();
        break;
    }
  }

  // Legacy methods - maintained for backward compatibility
  onFavorite() {
    this.favoritesClicked.emit();
  }

  onShare() {
    this.shareClicked.emit();
  }

  onQuote() {
    this.quoteClicked.emit();
  }

  onInfo() {
    this.infoClicked.emit();
  }

  onDelete() {
    this.deleteClicked.emit();
  }

  onDownload() {
    this.downloadClicked.emit();
  }

}
