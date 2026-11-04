import { Component, inject, Input, OnDestroy, effect, computed } from '@angular/core';
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
  /**
   * Set on the copy projected into the fullscreen overlay slot. That instance is
   * an overlay pinned over the viewer, not part of the document flow, so it must
   * not touch `uiState.licenseBarVisible` — that signal reserves vertical space
   * in the layout, and a second writer would either double-reserve it or clear
   * it on destroy while the in-flow bar is still shown.
   */
  @Input() overlay = false;

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
      const visible = this.visible();
      if (this.overlay) return;
      this.uiState.licenseBarVisible.set(visible);
    });
  }

  getLocalizedText(bar: LicenseBarConfig): string {
    const lang = this.translateService.getCurrentLang();
    const text = bar.text ?? {};
    return text[lang] ?? text['en'] ?? text[Object.keys(text)[0]] ?? '';
  }

  ngOnDestroy() {
    if (this.overlay) return;
    this.uiState.licenseBarVisible.set(false);
  }
}
