import { Component, Input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { NgClass } from '@angular/common';
import { DocumentTypeEnum } from '../../../modules/constants/document-type';
import {getModelIcon, RecordItem} from "../record-item/record-item.model";

@Component({
  selector: 'app-model-badge',
  imports: [TranslatePipe, NgClass],
  templateUrl: './model-badge.component.html',
  styleUrl: './model-badge.component.scss'
})
export class ModelBadgeComponent {
  @Input() model: DocumentTypeEnum | '' = '';
  @Input() monographUnitCount: number = 0;

  protected readonly DocumentTypeEnum = DocumentTypeEnum;

  shouldShowCount(): boolean {
    if (!this.model) return false;
    const modelKey = this.model.toLowerCase();
    return (
      (modelKey === DocumentTypeEnum.monograph || modelKey === DocumentTypeEnum.monographunit) &&
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
