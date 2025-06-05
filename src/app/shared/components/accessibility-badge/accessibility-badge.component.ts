import {Component, Input} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {NgClass} from '@angular/common';
import {DocumentAccessibilityEnum} from '../../../modules/constants/document-accessibility';

@Component({
  selector: 'app-accessibility-badge',
  imports: [
    TranslatePipe,
    NgClass,
  ],
  templateUrl: './accessibility-badge.component.html',
  styleUrl: './accessibility-badge.component.scss'
})
export class AccessibilityBadgeComponent {

  @Input() accessibility: DocumentAccessibilityEnum = DocumentAccessibilityEnum.PUBLIC;

  protected readonly DocumentAccessibilityEnum = DocumentAccessibilityEnum;
}
