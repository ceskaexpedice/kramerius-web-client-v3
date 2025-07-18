import {Component, inject, Input} from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { AccessibilityBadgeComponent } from '../accessibility-badge/accessibility-badge.component';
import { DocumentAccessibilityEnum } from '../../../modules/constants/document-accessibility';
import { EnvironmentService } from '../../services/environment.service';
import {RecordHandlerService} from '../../services/record-handler.service';

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
    AccessibilityBadgeComponent,
    NgClass,
  ],
  templateUrl: './item-card.component.html',
  styleUrl: './item-card.component.scss'
})
export class ItemCardComponent {
  @Input() uuid!: string;
  @Input() title!: string;
  @Input() subtitle?: string;
  @Input() model!: string;
  @Input() link: string | null = null;
  @Input() accessibility: DocumentAccessibilityEnum = DocumentAccessibilityEnum.PUBLIC;
  @Input() className?: string;

  @Input() showFavoriteButton: boolean = true;
  @Input() showAccessibilityBadge: boolean = false;

  private krameriusBaseUrl: string;

  private recordHandlerService = inject(RecordHandlerService);

  constructor(private envService: EnvironmentService) {
    this.krameriusBaseUrl = this.envService.getApiUrl('items');
  }

  toggleFavorite() {
    // Implement this method
    if (!this.showFavoriteButton) return;
  }

  getKrameriusBaseUrl(): string {
    return this.krameriusBaseUrl + '/' + this.uuid + '/image/thumb';
  }

  goToDetail() {
    this.recordHandlerService.handleDocumentClickByModelAndPid(this.model, this.uuid);
  }

}
