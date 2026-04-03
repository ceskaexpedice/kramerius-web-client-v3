import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TtsService } from '../../../services/tts.service';
import { AiPanelService } from '../../../services/ai-panel.service';
import { DetailViewService } from '../../../../modules/detail-view-page/services/detail-view.service';

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

  onRead(): void {
    const pid = this.detailViewService.currentPagePid;
    if (!pid) return;

    if (this.ttsService.isReading()) {
      this.ttsService.stop();
    } else {
      this.ttsService.startReading(pid, this.detailViewService.document?.uuid);
    }
  }

  onTranslate(): void {
    const pid = this.detailViewService.currentPagePid;
    if (!pid) return;
    this.aiPanelService.showTranslation(pid);
  }

  onSummarize(): void {
    const pid = this.detailViewService.currentPagePid;
    if (!pid) return;
    this.aiPanelService.showSummary(pid);
  }
}
