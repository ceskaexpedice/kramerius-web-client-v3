import { Component, Input } from '@angular/core';
import { ONLINE_LICENSES } from '../../../core/solr/solr-misc';
import { TranslatePipe } from '@ngx-translate/core';
import { NgClass } from '@angular/common';
import { DocumentAccessibilityEnum } from '../../../modules/constants/document-accessibility';

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

  @Input() isLocked = false;
  @Input() showIcon = true;

  @Input() licenses: string[] = [];

  protected readonly DocumentAccessibilityEnum = DocumentAccessibilityEnum;

  get accessibility() {
    if (this.isLocked) {
      if (this.hasOnlineLicense()) {
        return DocumentAccessibilityEnum.PRIVATE;
      }
      return 'in_library';
    }
    return DocumentAccessibilityEnum.PUBLIC;
  }

  private hasOnlineLicense(): boolean {
    return this.licenses.some(license => ONLINE_LICENSES.includes(license));
  }
}
