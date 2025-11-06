import {Component, EventEmitter, inject, Input, Output} from '@angular/core';
import {EnvironmentService} from '../../../../shared/services/environment.service';
import {NgClass, NgIf} from '@angular/common';
import {CheckboxComponent} from '../../../../shared/components/checkbox/checkbox.component';
import {SelectionService} from '../../../../shared/services';

@Component({
  selector: 'app-detail-page-item',
  imports: [
    NgClass,
    NgIf,
    CheckboxComponent,
  ],
  templateUrl: './detail-page-item.component.html',
  styleUrl: './detail-page-item.component.scss'
})
export class DetailPageItemComponent {
  private krameriusBaseUrl: string;

  private envService = inject(EnvironmentService);
  public selectionService = inject(SelectionService);

  @Input() page: any; // Replace 'any' with the actual type of 'page' if known
  @Input() pageNumber: string | null = '0';
  @Input() pageNumberPosition: 'left' | 'right' = 'right';
  @Input() isSelected: boolean = false;

  @Input() type: 'recording' | 'page' = 'page';

  @Output() pageClicked: EventEmitter<any> = new EventEmitter<any>();

  constructor() {
    this.krameriusBaseUrl = this.envService.getApiUrl('items');
  }

  getImageUrl(): string {
    return this.krameriusBaseUrl + '/' + this.page.pid + '/image/thumb';
  }

  onPageClicked(event: MouseEvent) {
    if (this.selectionService.selectionMode()) {
      event.preventDefault();
      this.selectionService.toggleItem(this.page.pid);
    } else {
      this.pageClicked.emit();
    }
  }

  onSelectionChange(selected: boolean): void {
    if (selected) {
      this.selectionService.selectItem(this.page.pid);
    } else {
      this.selectionService.deselectItem(this.page.pid);
    }
  }

}
