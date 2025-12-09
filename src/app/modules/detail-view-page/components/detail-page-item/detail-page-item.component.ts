import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { EnvironmentService } from '../../../../shared/services/environment.service';
import { NgClass, NgIf } from '@angular/common';
import { CheckboxComponent } from '../../../../shared/components/checkbox/checkbox.component';
import { SelectionService } from '../../../../shared/services';
import { TranslatePipe } from '@ngx-translate/core';
import { ImagePreviewPopupComponent } from '../../../../shared/components/image-preview-popup/image-preview-popup.component';
import { PopupPositioningService, PopupState } from '../../../../shared/services/popup-positioning.service';

@Component({
  selector: 'app-detail-page-item',
  imports: [
    NgClass,
    NgIf,
    CheckboxComponent,
    TranslatePipe,
    ImagePreviewPopupComponent,
  ],
  templateUrl: './detail-page-item.component.html',
  styleUrl: './detail-page-item.component.scss'
})
export class DetailPageItemComponent {
  private krameriusBaseUrl: string;

  private envService = inject(EnvironmentService);
  public selectionService = inject(SelectionService);
  private popupPositioningService = inject(PopupPositioningService);

  @Input() page: any; // Replace 'any' with the actual type of 'page' if known
  @Input() pageNumber: string | null = '0';
  @Input() pageNumberPosition: 'left' | 'right' = 'right';
  @Input() isSelected: boolean = false;

  @Input() type: 'recording' | 'page' = 'page';

  // Local selection mode inputs (when not using global SelectionService)
  @Input() localSelectionMode: boolean = false; // If true, use local selection instead of SelectionService
  @Input() localIsSelected: boolean = false; // Local selection state

  // Show preview button
  @Input() showPreviewButton: boolean = false;

  @Output() pageClicked: EventEmitter<any> = new EventEmitter<any>();
  @Output() selectionToggled: EventEmitter<{ selected: boolean; event?: MouseEvent }> = new EventEmitter<{ selected: boolean; event?: MouseEvent }>();

  previewPopupState: PopupState;

  constructor() {
    this.krameriusBaseUrl = this.envService.getApiUrl('items');
    this.previewPopupState = this.popupPositioningService.createPopupState();
  }

  getImageUrl(): string {
    return this.krameriusBaseUrl + '/' + this.page.pid + '/image/thumb';
  }

  getFullImageUrl(): string {
    return this.krameriusBaseUrl + '/' + this.page.pid + '/image';
  }

  onPreviewClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    this.popupPositioningService.showPopup(
      this.previewPopupState,
      {
        triggerEvent: event,
        popupWidth: 600,
        popupHeight: 500,
        preferredSide: 'center',
        offsetY: 10
      },
      '.preview-popup-wrapper'
    );
  }

  onPageClicked(event: MouseEvent) {
    // Check if we're in local selection mode first
    if (this.localSelectionMode) {
      event.preventDefault();
      this.selectionToggled.emit({ selected: !this.localIsSelected, event });
    } else if (this.selectionService.selectionMode()) {
      event.preventDefault();
      this.selectionService.toggleItem(this.page.pid);
    } else {
      this.pageClicked.emit();
    }
  }

  onSelectionChange(selected: boolean): void {
    // Check if we're in local selection mode first
    if (this.localSelectionMode) {
      this.selectionToggled.emit({ selected });
    } else {
      if (selected) {
        this.selectionService.selectItem(this.page.pid);
      } else {
        this.selectionService.deselectItem(this.page.pid);
      }
    }
  }

  // Helper method to determine if selection mode is active (global or local)
  isInSelectionMode(): boolean {
    return this.localSelectionMode || this.selectionService.selectionMode();
  }

  // Helper method to determine if this item is selected (global or local)
  isItemSelected(): boolean {
    return this.localSelectionMode
      ? this.localIsSelected
      : this.selectionService.isSelected(this.page.pid);
  }

}
