import {Component, inject, Input} from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { AccessibilityBadgeComponent } from '../accessibility-badge/accessibility-badge.component';
import { DocumentAccessibilityEnum } from '../../../modules/constants/document-accessibility';
import { EnvironmentService } from '../../services/environment.service';
import {RecordHandlerService} from '../../services/record-handler.service';
import {Router} from '@angular/router';
import { AdminSelectionService } from '../../services/admin-selection.service';
import { CheckboxComponent } from '../checkbox/checkbox.component';

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
    CheckboxComponent,
  ],
  templateUrl: './item-card.component.html',
  styleUrl: './item-card.component.scss'
})
export class ItemCardComponent {
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
  public adminSelectionService = inject(AdminSelectionService);

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

  onSelectionChange(selected: boolean): void {
    if (selected) {
      this.adminSelectionService.selectItem(this.uuid);
    } else {
      this.adminSelectionService.deselectItem(this.uuid);
    }
  }

  onCardClick(event: Event): void {
    if (this.adminSelectionService.adminMode()) {
      this.adminSelectionService.toggleItem(this.uuid);
    } else {
      // Navigate to detail page in normal mode
      this.recordHandlerService.handleDocumentClickByModelAndPid(this.model, this.uuid);
    }
  }

  protected readonly DocumentAccessibilityEnum = DocumentAccessibilityEnum;
}
