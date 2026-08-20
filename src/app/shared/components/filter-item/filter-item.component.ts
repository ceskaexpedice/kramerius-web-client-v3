import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { MatCheckbox } from '@angular/material/checkbox';
import { TranslatePipe } from '@ngx-translate/core';
import { NgClass } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { FormatNumberPipe } from '../../pipes/format-number.pipe';
import { ConfigLabelPipe } from '../../pipes/config-label.pipe';
import { NamespacedTranslatePipe } from '../../pipes/namespaced-translate.pipe';
import {facetKeysEnum} from '../../../modules/search-results-page/const/facets';
import { LanguageBadgeComponent } from '../language-badge/language-badge.component';
import { ConfigService } from '../../../core/config/config.service';
import { AppTranslationService } from '../../translation/app-translation.service';
import { CdkTooltipDirective } from '../../directives/cdk-tooltip/cdk-tooltip.directive';
import { LicenseInfoDialogComponent } from '../../dialogs/license-info-dialog/license-info-dialog.component';

@Component({
  selector: 'app-filter-item',
  imports: [
    MatCheckbox,
    NgClass,
    FormatNumberPipe,
    TranslatePipe,
    ConfigLabelPipe,
    NamespacedTranslatePipe,
    LanguageBadgeComponent,
    CdkTooltipDirective,
  ],
  templateUrl: './filter-item.component.html',
  styleUrl: './filter-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilterItemComponent {

  private configService = inject(ConfigService);
  private translationService = inject(AppTranslationService);
  private dialog = inject(MatDialog);

  @Input() label!: string;
  @Input() facetKey?: string; // Used to determine translation source
  @Input() truncateLabel: boolean = false;
  @Input() count!: number;
  @Input() checked = false;
  @Input() icon: string | null = null;
  /** When set, always renders a language badge (with text fallback if no flag). */
  @Input() langCode: string | null = null;
  @Input() disabled = false;
  @Input() itemIconClass?: string;
  @Input() colorDot: string | null = null;
  @Output() toggled = new EventEmitter<void>();

  get isImageIcon(): boolean {
    return this.icon?.includes('/') || this.icon?.includes('.') || false;
  }

  get isLicense(): boolean {
    return this.facetKey === facetKeysEnum.license;
  }

  /** Message page key used for the license description shown in the filter info dialog. */
  private static readonly LICENSE_INFO_PAGE_KEY = 'unauthenticated';

  /** True for license items that have a description message page configured (info dialog content). */
  get hasLicenseInfo(): boolean {
    if (!this.isLicense) {
      return false;
    }
    const lang = this.translationService.currentLanguage().code;
    return !!this.configService.getMessagePageUrl(this.label, FilterItemComponent.LICENSE_INFO_PAGE_KEY, lang);
  }

  /**
   * Opens a dialog with the license description, loaded from the license's
   * "unauthenticated" message page HTML defined in config-licenses.json
   * (e.g. dnnto -> local-config/html/licenses/dnnto.cs.html).
   */
  async openLicenseInfo(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const lang = this.translationService.currentLanguage().code;
    const url = this.configService.getMessagePageUrl(this.label, FilterItemComponent.LICENSE_INFO_PAGE_KEY, lang);
    if (!url) {
      return;
    }

    const content = await this.configService.loadHtmlContent(url);
    const title = this.configService.getLocalizedLabel('license', this.label, lang);

    this.dialog.open(LicenseInfoDialogComponent, {
      data: { title, content },
      autoFocus: false,
      restoreFocus: false,
      panelClass: 'simple-dialog-panel'
    });
  }

}
