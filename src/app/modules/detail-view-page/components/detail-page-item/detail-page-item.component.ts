import {Component, EventEmitter, inject, Input, Output} from '@angular/core';
import {EnvironmentService} from '../../../../shared/services/environment.service';
import {
  AccessibilityBadgeComponent
} from '../../../../shared/components/accessibility-badge/accessibility-badge.component';
import {NgIf} from '@angular/common';

@Component({
  selector: 'app-detail-page-item',
  imports: [
    AccessibilityBadgeComponent,
    NgIf,
  ],
  templateUrl: './detail-page-item.component.html',
  styleUrl: './detail-page-item.component.scss'
})
export class DetailPageItemComponent {
  private krameriusBaseUrl: string;

  private envService = inject(EnvironmentService);

  @Input() page: any; // Replace 'any' with the actual type of 'page' if known
  @Input() pageNumber: number = 0;
  @Input() isSelected: boolean = false;

  @Output() pageClicked: EventEmitter<any> = new EventEmitter<any>();

  constructor() {
    this.krameriusBaseUrl = this.envService.getApiUrl('items');
  }

  getImageUrl(): string {
    return this.krameriusBaseUrl + '/' + this.page.pid + '/image/thumb';
  }

  onPageClicked() {
    this.pageClicked.emit();
  }

}
