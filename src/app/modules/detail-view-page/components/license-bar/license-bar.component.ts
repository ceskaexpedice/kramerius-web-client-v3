import { Component, inject, OnDestroy, effect } from '@angular/core';
import { DetailViewService } from '../../services/detail-view.service';
import { UiStateService } from '../../../../shared/services/ui-state.service';
import { UserService } from '../../../../shared/services/user.service';
import { ConfigService } from '../../../../core/config/config.service';
import { TranslateService } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
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

  readonly activeBars = toSignal(
    this.detailViewService.document$.pipe(
      map(doc => {
        if (!doc?.licences?.length || !this.userService.userSession?.authenticated) return [];
        const docLicenses = doc.licences;
        return this.configService.getLicenseBars().filter(bar =>
          bar.licenses.some(l => docLicenses.includes(l)) &&
          !docLicenses.includes('public')
        );
      })
    ),
    { initialValue: [] as LicenseBarConfig[] }
  );

  private visible = toSignal(
    this.detailViewService.document$.pipe(
      map(doc => {
        if (!doc?.licences?.length || !this.userService.userSession?.authenticated) return false;
        const docLicenses = doc.licences;
        return this.configService.getLicenseBars().some(bar =>
          bar.licenses.some(l => docLicenses.includes(l)) &&
          !docLicenses.includes('public')
        );
      })
    ),
    { initialValue: false }
  );

  constructor() {
    effect(() => {
      this.uiState.licenseBarVisible.set(this.visible());
    });
  }

  getLocalizedText(bar: LicenseBarConfig): string {
    const lang = this.translateService.currentLang;
    return bar.text[lang] ?? bar.text['en'] ?? bar.text[Object.keys(bar.text)[0]] ?? '';
  }

  ngOnDestroy() {
    this.uiState.licenseBarVisible.set(false);
  }
}
