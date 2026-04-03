import { Component, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { AiPanelService } from '../../../services/ai-panel.service';
import { LanguageBadgeComponent } from '../../language-badge/language-badge.component';
import { ClickOutsideDirective } from '../../../directives/click-outside';
import { AppTranslationService } from '../../../translation/app-translation.service';
import { Language } from '../../../translation/lang-picker/language';
import { copyTextToClipboard } from '../../../misc/misc-functions';

@Component({
  selector: 'app-ai-content-toolbar',
  standalone: true,
  imports: [CommonModule, TranslatePipe, LanguageBadgeComponent, ClickOutsideDirective],
  templateUrl: './ai-content-toolbar.component.html',
  styleUrl: './ai-content-toolbar.component.scss'
})
export class AiContentToolbarComponent {
  aiPanelService = inject(AiPanelService);
  private translationService = inject(AppTranslationService);

  @Output() fullscreenToggle = new EventEmitter<void>();
  @Output() closePanel = new EventEmitter<void>();

  languages: Language[] = this.translationService.languages;
  langPickerExpanded = false;

  get selectedLanguage(): Language {
    const targetLang = this.aiPanelService.targetLanguage();
    return this.languages.find(l => l.code === targetLang) || this.languages[0];
  }

  get headerKey(): string {
    const type = this.aiPanelService.contentType();
    if (type === 'translation') return 'ai.translation-result';
    if (type === 'summary') return 'ai.summary-result';
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

  toggleLangPicker(): void {
    this.langPickerExpanded = !this.langPickerExpanded;
  }

  closeLangPicker(): void {
    this.langPickerExpanded = false;
  }

  selectLanguage(lang: Language): void {
    this.langPickerExpanded = false;
    if (lang.code !== this.aiPanelService.targetLanguage()) {
      this.aiPanelService.retranslate(lang.code);
    }
  }
}
