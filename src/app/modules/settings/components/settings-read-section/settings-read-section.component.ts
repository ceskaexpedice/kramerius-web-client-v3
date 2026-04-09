import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { Settings, TtsVoiceEntry } from '../../settings.model';
import { LanguageBadgeComponent } from '../../../../shared/components/language-badge/language-badge.component';
import { LanguageSelectComponent } from '../../../../shared/components/language-select/language-select.component';
import { TtsVoiceDropdownComponent } from './tts-voice-dropdown/tts-voice-dropdown.component';
import { AppTranslationService } from '../../../../shared/translation/app-translation.service';
import { AiApiService, TtsProvider } from '../../../../shared/services/ai-api.service';
import { take } from 'rxjs/operators';
import { TRANSLATION_LANGUAGES } from '../../../../shared/translation/translation-languages';
import { Language } from '../../../../shared/translation/lang-picker/language';
import { TtsVoiceOption, SAMPLE_TEXTS, getAllVoices, getVoiceLabel } from './tts-voices.data';

@Component({
  selector: 'app-settings-read-section',
  standalone: true,
  imports: [CommonModule, TranslatePipe, LanguageBadgeComponent, LanguageSelectComponent, TtsVoiceDropdownComponent],
  templateUrl: './settings-read-section.component.html',
  styleUrl: './settings-read-section.component.scss'
})
export class SettingsReadSectionComponent implements OnInit {
  @Input() settings!: Settings;
  @Output() settingsChange = new EventEmitter<Settings>();

  private translationService = inject(AppTranslationService);
  private aiApiService = inject(AiApiService);

  readonly allLanguages = TRANSLATION_LANGUAGES;
  voiceEntries: TtsVoiceEntry[] = [];
  previewingIndex = -1;
  private audio = new Audio();

  get availableLanguages(): Language[] {
    const used = new Set(this.voiceEntries.map(e => e.langCode));
    return this.allLanguages.filter(l => !used.has(l.code));
  }

  ngOnInit(): void {
    if (this.settings.ttsVoices?.length) {
      this.voiceEntries = this.settings.ttsVoices.map(v => ({ ...v }));
    }
    if (!this.voiceEntries.some(e => e.isPrimary)) {
      const appLang = this.translationService.currentLanguage().code;
      const existing = this.voiceEntries.find(e => e.langCode === appLang);
      if (existing) {
        existing.isPrimary = true;
      } else {
        this.voiceEntries.unshift({ langCode: appLang, voice: 'fable', provider: 'openai', isPrimary: true });
      }
      this.emitChange();
    }
  }

  getLanguage(code: string): Language {
    return this.allLanguages.find(l => l.code === code) || { code, name: code, icon: '' };
  }

  getVoiceLabel(entry: TtsVoiceEntry): string {
    return getVoiceLabel(entry.voice, entry.langCode);
  }

  onVoiceChange(index: number, voice: TtsVoiceOption): void {
    this.voiceEntries[index].voice = voice.code;
    this.voiceEntries[index].provider = voice.provider;
    this.emitChange();
  }

  addLanguage(code: string): void {
    const lang = this.allLanguages.find(l => l.code === code);
    if (!lang) return;
    this.voiceEntries.push({ langCode: lang.code, voice: 'fable', provider: 'openai', isPrimary: false });
    this.emitChange();
  }

  setPrimary(index: number): void {
    this.voiceEntries.forEach((e, i) => { e.isPrimary = i === index; });
    this.emitChange();
  }

  removeEntry(index: number): void {
    if (this.voiceEntries[index].isPrimary) return;
    this.voiceEntries.splice(index, 1);
    this.emitChange();
  }

  previewVoice(index: number): void {
    const entry = this.voiceEntries[index];
    if (!entry.voice) return;

    if (this.previewingIndex === index) {
      this.audio.pause();
      this.previewingIndex = -1;
      return;
    }

    this.previewingIndex = index;
    const sampleText = SAMPLE_TEXTS[entry.langCode] || SAMPLE_TEXTS['en'];

    this.aiApiService.textToSpeech(sampleText, entry.langCode, entry.provider as TtsProvider, entry.voice)
      .pipe(take(1))
      .subscribe({
        next: (audioContent) => this.playAudio(audioContent, () => { this.previewingIndex = -1; }),
        error: () => { this.previewingIndex = -1; }
      });
  }

  private playAudio(base64: string, onEnd: () => void): void {
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'audio/mpeg' });
    if (this.audio.src?.startsWith('blob:')) {
      URL.revokeObjectURL(this.audio.src);
    }
    this.audio.src = URL.createObjectURL(blob);
    this.audio.onended = onEnd;
    this.audio.play().catch(onEnd);
  }

  private emitChange(): void {
    this.settingsChange.emit({ ...this.settings, ttsVoices: this.voiceEntries.map(v => ({ ...v })) } as Settings);
  }
}
