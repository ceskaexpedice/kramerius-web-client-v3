import {Component, EventEmitter, inject, Input, Output} from '@angular/core';
import {EnvironmentService} from '../../../../shared/services/environment.service';
import {NgClass, NgIf} from '@angular/common';
import {AdminSelectionService} from '../../../../shared/services/admin-selection.service';
import {CheckboxComponent} from '../../../../shared/components/checkbox/checkbox.component';

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
  public adminSelectionService = inject(AdminSelectionService);

  @Input() page: any; // Replace 'any' with the actual type of 'page' if known
  @Input() pageNumber: string = '0';
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
    if (this.adminSelectionService.adminMode()) {
      event.preventDefault();
      this.adminSelectionService.toggleItem(this.page.pid);
    } else {
      this.pageClicked.emit();
    }
  }

  onSelectionChange(selected: boolean): void {
    if (selected) {
      this.adminSelectionService.selectItem(this.page.pid);
    } else {
      this.adminSelectionService.deselectItem(this.page.pid);
    }
  }

}
