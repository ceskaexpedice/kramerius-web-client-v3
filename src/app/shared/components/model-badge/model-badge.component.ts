import { Component, Input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { NgClass } from '@angular/common';
import { DocumentTypeEnum } from '../../../modules/constants/document-type';
import { getModelIcon } from "../../utils/filter-icons.utils";

const MODELS_WITH_SHORT_LABEL = new Set<string>([
  'soundrecording',
  'periodicalvolume',
  'periodicalitem',
  'clippingsvolume',
  'archive',
]);

@Component({
  selector: 'app-model-badge',
  imports: [TranslatePipe, NgClass],
  templateUrl: './model-badge.component.html',
  styleUrl: './model-badge.component.scss'
})
export class ModelBadgeComponent {
  @Input() model: DocumentTypeEnum | '' = '';
  @Input() monographUnitCount: number = 0;
  @Input() compact: boolean = false;

  getLabelKey(): string {
    if (!this.model) return '';
    if (this.compact && MODELS_WITH_SHORT_LABEL.has(this.model)) {
      return `${this.model}-short`;
    }
    return this.model;
  }

  protected readonly DocumentTypeEnum = DocumentTypeEnum;

  shouldShowCount(): boolean {
    if (!this.model) return false;
    const modelKey = this.model.toLowerCase();
    return (
      (modelKey === DocumentTypeEnum.monograph || modelKey === DocumentTypeEnum.monographunit || modelKey === DocumentTypeEnum.convolute) &&
      this.monographUnitCount > 0
    );
  }

  hasDoubleBookIcon(): boolean {
    if (!this.model) return false;
    const modelKey = this.model.toLowerCase();
    return modelKey === DocumentTypeEnum.monograph && this.monographUnitCount > 0;
  }

  protected readonly getModelIcon = getModelIcon;
}
