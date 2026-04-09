import { Component, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { AiPanelService } from '../../../services/ai-panel.service';
import { LanguageSelectComponent } from '../../language-select/language-select.component';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { TRANSLATION_LANGUAGES } from '../../../translation/translation-languages';
import { copyTextToClipboard } from '../../../misc/misc-functions';

@Component({
  selector: 'app-ai-content-toolbar',
  standalone: true,
  imports: [CommonModule, TranslatePipe, LanguageSelectComponent, MatSlideToggle],
  templateUrl: './ai-content-toolbar.component.html',
  styleUrl: './ai-content-toolbar.component.scss'
})
export class AiContentToolbarComponent {
  aiPanelService = inject(AiPanelService);

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

  copyContent(): void {
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
}
