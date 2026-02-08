import { Component, inject, Input } from '@angular/core';
import { ONLINE_LICENSES } from '../../../core/solr/solr-misc';
import { TranslatePipe } from '@ngx-translate/core';
import { NgClass } from '@angular/common';
import { UserService } from '../../services/user.service';

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

  @Input() isLocked = false;
  @Input() showIcon = true;
  @Input() licenses: string[] = [];

  get accessibility(): AccessibilityStatus {
    // Check if user has any license that grants access to this content
    if (this.userService.hasAnyLicense(this.licenses)) {
      return 'public';
    }

    // User doesn't have access - determine if it's online-accessible or in-library only
    if (this.hasOnlineLicense()) {
      return 'private';
    }

    return 'in_library';
  }

  get isAccessible(): boolean {
    return this.userService.hasAnyLicense(this.licenses);
  }

  private hasOnlineLicense(): boolean {
    return this.licenses.some(license => ONLINE_LICENSES.includes(license));
  }
}
