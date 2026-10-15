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

  /**
   * Whether the page has any OCR to work with.
   *
   * Read-aloud, translation and summarisation all need only the words, and
   * `AltoService` falls back to the plain `/ocr/text` datastream when a page has
   * no ALTO — so gating these on ALTO alone disabled them on pages whose text was
   * available all along. In a CDK document held by several libraries the same
   * page exists once per source and one copy can have ALTO where another has only
   * the text, so this is a real state, not a theoretical one.
   *
   * ALTO remains required for coordinates (search highlighting in the scan, and
   * the highlight that follows read-aloud), which degrade on their own.
   */
  get textAvailable(): boolean {
    return this.documentInfoService.hasAlto() || this.documentInfoService.hasOcrText();
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
    return !this.textAvailable || !this.textActionAllowed;
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
