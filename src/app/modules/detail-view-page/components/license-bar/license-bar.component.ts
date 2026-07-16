import { Component, inject, OnDestroy, effect, computed } from '@angular/core';
import { DetailViewService } from '../../services/detail-view.service';
import { UiStateService } from '../../../../shared/services/ui-state.service';
import { UserService } from '../../../../shared/services/user.service';
import { ConfigService } from '../../../../core/config/config.service';
import { TranslateService } from '@ngx-translate/core';
import { LicenseBarConfig } from '../../../../core/config/config.interfaces';

@Component({
  selector: 'app-license-bar',
  templateUrl: './license-bar.component.html',
  styleUrl: './license-bar.component.scss'
})
export class LicenseBarComponent implements OnDestroy {
  public detailViewService = inject(DetailViewService);
  public userService = inject(UserService);
  private uiState = inject(UiStateService);
  private configService = inject(ConfigService);
  private translateService = inject(TranslateService);

  // Computed from both the document signal AND the login state signal, so the bar
  // re-evaluates when the user logs in/out while already on the detail page (the
  // document itself does not re-emit on login). Reading isLoggedIn$() as a signal
  // makes it a reactive dependency.
  readonly activeBars = computed<LicenseBarConfig[]>(() => {
    const doc = this.detailViewService.document;
    const loggedIn = this.userService.isLoggedIn$();
    if (!doc?.licences?.length || !loggedIn) return [];
    const docLicenses = doc.licences;
    return this.configService.getLicenseBars().filter(bar =>
      bar.licenses.some(l => docLicenses.includes(l)) &&
      !docLicenses.includes('public')
    );
  });

  private visible = computed<boolean>(() => this.activeBars().length > 0);

  constructor() {
    effect(() => {
      this.uiState.licenseBarVisible.set(this.visible());
    });
  }

  getLocalizedText(bar: LicenseBarConfig): string {
    const lang = this.translateService.getCurrentLang();
    return bar.text[lang] ?? bar.text['en'] ?? bar.text[Object.keys(bar.text)[0]] ?? '';
  }

  ngOnDestroy() {
    this.uiState.licenseBarVisible.set(false);
  }
}
