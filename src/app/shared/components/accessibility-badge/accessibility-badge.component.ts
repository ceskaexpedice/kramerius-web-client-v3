import {Component, inject, Input} from '@angular/core';
import { getOnlineLicenses, getOpenLicenses } from '../../../core/solr/solr-misc';
import { TranslatePipe } from '@ngx-translate/core';
import { NgClass } from '@angular/common';
import { UserService } from '../../services/user.service';
import {RecordHandlerService} from '../../services/record-handler.service';
import { getAccessIcon } from '../../../modules/search-results-page/const/facets';

export type AccessibilityStatus = 'public' | 'private' | 'in_library';

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
  private userService = inject(UserService);
  private recordHandler = inject(RecordHandlerService);

  @Input() isLocked = false;
  @Input() showIcon = true;
  @Input() licenses: string[] = [];
  @Input() showText = false;

  get accessibility() {
    return this.recordHandler.getRecordLicenseForBadge(this.licenses);
  }

  /**
   * Accessibility icon, shared with the search facets so both stay in sync.
   * Like the legacy client, the glyph follows the access type and the user's
   * actual access picks the plain vs. struck-through variant (key vs. key_off).
   */
  private get facetIcon() {
    const accessType = this.accessibility === 'public' ? 'open'
      : this.accessibility === 'in_library' ? 'terminal'
      : 'login';
    return getAccessIcon(accessType, this.isAccessible);
  }

  /** CSS class for the icon element. */
  get iconClass(): string {
    return this.facetIcon.icon;
  }

  /** Material Icons ligature name, rendered as the element's text. */
  get materialIcon(): string {
    return this.facetIcon.materialIcon;
  }

  get isAccessible(): boolean {
    return this.userService.hasAnyLicense(this.licenses);
  }

  private hasOnlineLicense(): boolean {
    const onlineLicenses = getOnlineLicenses();
    return this.licenses.some(license => onlineLicenses.includes(license));
  }

  private hasOpenLicense(): boolean {
    const openLicenses = getOpenLicenses();
    return this.licenses.some(license => openLicenses.includes(license));
  }
}
