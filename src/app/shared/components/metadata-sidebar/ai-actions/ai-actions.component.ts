import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { TtsService } from '../../../services/tts.service';
import { AiPanelService } from '../../../services/ai-panel.service';
import { DetailViewService } from '../../../../modules/detail-view-page/services/detail-view.service';
import { UserService } from '../../../services/user.service';
import { SettingsService } from '../../../../modules/settings/settings.service';
import { DocumentInfoService } from '../../../services/document-info.service';
import { ConfigService } from '../../../../core/config/config.service';

@Component({
  selector: 'app-ai-actions',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './ai-actions.component.html',
  styleUrl: './ai-actions.component.scss'
})
export class AiActionsComponent {

  ttsService = inject(TtsService);
  aiPanelService = inject(AiPanelService);
  private detailViewService = inject(DetailViewService);
  userService = inject(UserService);
  private router = inject(Router);
  private settingsService = inject(SettingsService);
  documentInfoService = inject(DocumentInfoService);
  private configService = inject(ConfigService);

  get altoAvailable(): boolean {
    return this.documentInfoService.hasAlto();
  }

  get textActionAllowed(): boolean {
    const licenses = this.documentInfoService.getRuntimeLicenses();
    if (!licenses || licenses.length === 0) {
      return true;
    }
    return licenses.some(licenseId => {
      const config = this.configService.getLicenseConfig(licenseId);
      return config?.actions?.text === true;
    });
  }

  get actionsDisabled(): boolean {
    return !this.altoAvailable || !this.textActionAllowed;
  }

  openReadingSettings(event: Event): void {
    event.stopPropagation();
    this.settingsService.openSettingsDialog('reading');
  }

  login(): void {
    // Route through the terms page so the licence/GDPR consent step is not
    // bypassed, and carry the full router URL (incl. ?page=) so the user comes
    // back to the page they were on rather than the first page of the document.
    const returnUrl = this.router.url;
    this.router.navigate(['pages/terms'], { queryParams: { returnUrl } });
  }

  onRead(): void {
    if (!this.userService.isLoggedIn || this.actionsDisabled) return;
    const pid = this.detailViewService.currentPagePid;
    if (!pid) return;

    if (this.ttsService.isReading()) {
      this.ttsService.stop();
    } else {
      this.ttsService.startReading(pid, this.detailViewService.document?.uuid);
    }
  }

  onTranslate(): void {
    if (!this.userService.isLoggedIn || this.actionsDisabled) return;
    const pid = this.detailViewService.currentPagePid;
    if (!pid) return;
    this.aiPanelService.showTranslation(pid);
  }

  onSummarize(): void {
    if (!this.userService.isLoggedIn || this.actionsDisabled) return;
    const pid = this.detailViewService.currentPagePid;
    if (!pid) return;
    this.aiPanelService.showSummary(pid);
  }
}
