import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { AiPanelService } from '../../../services/ai-panel.service';
import { TtsService } from '../../../services/tts.service';
import { LanguageSelectComponent } from '../../language-select/language-select.component';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { TRANSLATION_LANGUAGES } from '../../../translation/translation-languages';
import { copyTextToClipboard } from '../../../misc/misc-functions';
import { DetailViewService } from '../../../../modules/detail-view-page/services/detail-view.service';
import { CdkTooltipDirective } from '../../../directives/cdk-tooltip';

@Component({
  selector: 'app-ai-content-toolbar',
  standalone: true,
  imports: [CommonModule, TranslatePipe, LanguageSelectComponent, MatSlideToggle, CdkTooltipDirective],
  templateUrl: './ai-content-toolbar.component.html',
  styleUrl: './ai-content-toolbar.component.scss'
})
export class AiContentToolbarComponent {
  aiPanelService = inject(AiPanelService);
  ttsService = inject(TtsService);
  private detailViewService = inject(DetailViewService, { optional: true });

  @Input() isFullscreen: boolean = false;

  @Output() fullscreenToggle = new EventEmitter<void>();
  @Output() closePanel = new EventEmitter<void>();

  translationLanguages = TRANSLATION_LANGUAGES;

  get headerKey(): string {
    const type = this.aiPanelService.contentType();
    if (type === 'translation') return 'ai.translation-result';
    if (type === 'summary') return 'ai.summary-result';
    if (type === 'text') return 'ai.selected-text';
    return 'ai';
  }

  toggleOriginal(): void {
    this.aiPanelService.toggleOriginal();
  }

  increaseFontSize(): void {
    this.aiPanelService.increaseFontSize();
  }

  decreaseFontSize(): void {
    this.aiPanelService.decreaseFontSize();
  }

  /**
   * Whether "copy to clipboard" may be offered for the current document.
   *
   * This button writes the text straight to the clipboard, so it bypasses both
   * halves of the `appNoTextCopy` protection on the panel body (`user-select`
   * and the cancelled `copy`/`cut` events). Leaving it enabled under
   * `text: false` would hand over in one click exactly what those blocks
   * prevent — so it goes away with them.
   */
  get canCopyContent(): boolean {
    return this.detailViewService?.isActionAllowed('text') ?? true;
  }

  copyContent(): void {
    if (!this.canCopyContent) return;
    const content = this.aiPanelService.content();
    if (content) {
      copyTextToClipboard(content);
    }
  }

  onLangChange(code: string): void {
    if (code !== this.aiPanelService.targetLanguage()) {
      this.aiPanelService.retranslate(code);
    }
  }

  onSummaryLangChange(code: string): void {
    if (code !== this.aiPanelService.summaryLanguage()) {
      this.aiPanelService.resummarize(code);
    }
  }

  onTtsPlayPause(): void {
    this.ttsService.togglePlayPause();
  }

  onTtsStop(): void {
    this.ttsService.stop();
  }

  onClose(): void {
    if (this.isFullscreen) {
      this.fullscreenToggle.emit();
    } else {
      this.closePanel.emit();
    }
  }
}
