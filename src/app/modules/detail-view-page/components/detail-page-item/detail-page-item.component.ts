import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { EnvironmentService } from '../../../../shared/services/environment.service';
import { NgClass, NgIf } from '@angular/common';
import { CheckboxComponent } from '../../../../shared/components/checkbox/checkbox.component';
import { SelectionService } from '../../../../shared/services';
import { TranslatePipe } from '@ngx-translate/core';

export interface PreviewClickEvent {
  page: any;
  pageNumber: string | number | null;
  imageUrl: string;
}

@Component({
  selector: 'app-detail-page-item',
  imports: [
    NgClass,
    NgIf,
    CheckboxComponent,
    TranslatePipe,
  ],
  templateUrl: './detail-page-item.component.html',
  styleUrl: './detail-page-item.component.scss'
})
export class DetailPageItemComponent {
  private krameriusBaseUrl: string;

  private envService = inject(EnvironmentService);
  public selectionService = inject(SelectionService);

  @Input() page: any; // Replace 'any' with the actual type of 'page' if known
  @Input() pageNumber: string | number | null = '0';
  @Input() pageNumberPosition: 'left' | 'right' | 'bottom-left' | 'bottom-right' = 'right';
  @Input() showPageNumberInSelectionMode: boolean = false;
  @Input() isSelected: boolean = false;

  @Input() type: 'recording' | 'page' = 'page';

  // Local selection mode inputs (when not using global SelectionService)
  @Input() localSelectionMode: boolean = false; // If true, use local selection instead of SelectionService
  @Input() localIsSelected: boolean = false; // Local selection state

  // Show preview button
  @Input() showPreviewButton: boolean = false;

  @Output() pageClicked: EventEmitter<any> = new EventEmitter<any>();
  @Output() selectionToggled: EventEmitter<{ selected: boolean; event?: MouseEvent }> = new EventEmitter<{ selected: boolean; event?: MouseEvent }>();
  @Output() previewClicked: EventEmitter<PreviewClickEvent> = new EventEmitter<PreviewClickEvent>();

  constructor() {
    this.krameriusBaseUrl = this.envService.getApiUrl('items');
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

    this.previewClicked.emit({
      page: this.page,
      pageNumber: this.pageNumber,
      imageUrl: this.getFullImageUrl()
    });
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
