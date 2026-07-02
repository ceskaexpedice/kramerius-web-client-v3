import { Component, Input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { NgClass } from '@angular/common';
import { DocumentTypeEnum } from '../../../modules/constants/document-type';
import { getModelIcon } from "../../utils/filter-icons.utils";
import { CdkTooltipDirective } from '../../directives/cdk-tooltip/cdk-tooltip.directive';

const MODELS_WITH_SHORT_LABEL = new Set<string>([
  'soundrecording',
  'periodicalvolume',
  'periodicalitem',
  'clippingsvolume',
  'archive',
]);

@Component({
  selector: 'app-model-badge',
  imports: [TranslatePipe, NgClass, CdkTooltipDirective],
  templateUrl: './model-badge.component.html',
  styleUrl: './model-badge.component.scss'
})
export class ModelBadgeComponent {
  @Input() model: DocumentTypeEnum | '' = '';
  @Input() monographUnitCount: number = 0;
  /** Order of this part within its multivolume parent (from `part.number.sort`) */
  @Input() partNumber?: number;
  @Input() compact: boolean = false;
  /**
   * When true, a monographunit badge shows its part number ("Díl (2/n)") and the
   * "part of a multivolume" tooltip. Used on listing cards/rows; off elsewhere.
   */
  @Input() showUnitDetails: boolean = false;

  getLabelKey(): string {
    if (!this.model) return '';
    // A multivolume monograph (a monograph that has units) is labelled in plural.
    if (this.isMultivolumeMonograph()) {
      return 'monograph-multivolume-label';
    }
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

  /** True for a single volume (unit) of a multivolume monograph. */
  isMonographUnit(): boolean {
    return !!this.model && this.model.toLowerCase() === DocumentTypeEnum.monographunit;
  }

  /** True for the multivolume monograph root (a monograph that has units). */
  isMultivolumeMonograph(): boolean {
    return !!this.model && this.model.toLowerCase() === DocumentTypeEnum.monograph && this.monographUnitCount > 0;
  }

  /** Whether the unit has a part number to display in the badge. */
  hasUnitPartNumber(): boolean {
    return this.showUnitDetails && this.isMonographUnit() && this.partNumber != null;
  }

  /** "2/4" for a unit. Total falls back to "n" when the parent count is unknown. */
  getUnitCountLabel(): string {
    const total = this.monographUnitCount > 0 ? this.monographUnitCount : 'n';
    return `${this.partNumber}/${total}`;
  }

  /** Translation key for the badge tooltip, or '' when no tooltip should show. */
  getTooltipKey(): string {
    if (this.showUnitDetails && this.isMonographUnit()) return 'model-badge.tooltip.multivolume-part';
    if (this.isMultivolumeMonograph()) return 'model-badge.tooltip.multivolume';
    return '';
  }

  hasDoubleBookIcon(): boolean {
    if (!this.model) return false;
    const modelKey = this.model.toLowerCase();
    return modelKey === DocumentTypeEnum.monograph && this.monographUnitCount > 0;
  }

  protected readonly getModelIcon = getModelIcon;
}
