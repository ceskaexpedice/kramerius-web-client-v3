import { Component, Input } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { AccessibilityBadgeComponent } from '../accessibility-badge/accessibility-badge.component';
import { DocumentAccessibilityEnum } from '../../../modules/constants/document-accessibility';
import { EnvironmentService } from '../../services/environment.service';

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
  @Input() link: string | null = null;
  @Input() accessibility: DocumentAccessibilityEnum = DocumentAccessibilityEnum.PUBLIC;
  @Input() className?: string;

  @Input() showFavoriteButton: boolean = true;
  @Input() showAccessibilityBadge: boolean = false;

  private krameriusBaseUrl: string;

  constructor(private envService: EnvironmentService) {
    this.krameriusBaseUrl = this.envService.get('krameriusBaseUrl');
  }

  toggleFavorite() {
    // Implement this method
    if (!this.showFavoriteButton) return;
  }

  getKrameriusBaseUrl(): string {
    return this.krameriusBaseUrl;
  }

}
