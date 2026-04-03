import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Settings, TtsVoiceEntry } from '../../settings.model';
import { LanguageBadgeComponent } from '../../../../shared/components/language-badge/language-badge.component';
import { AppTranslationService } from '../../../../shared/translation/app-translation.service';
import { AiApiService, TtsProvider } from '../../../../shared/services/ai-api.service';
import { ClickOutsideDirective } from '../../../../shared/directives/click-outside';
import { take } from 'rxjs/operators';

export interface TtsVoiceOption {
  name: string;
  code: string;
  gender: string;
  provider: 'openai' | 'google' | 'elevenlabs';
}

export interface TtsLanguage {
  code: string;
  name: string;
  icon: string;
}

// All translatable languages (matching original app)
const TTS_LANGUAGES: TtsLanguage[] = [
  { code: 'cs', name: 'Čeština', icon: 'img/flag/cs.svg' },
  { code: 'sk', name: 'Slovenčina', icon: 'img/flag/sk.svg' },
  { code: 'en', name: 'English', icon: 'img/flag/en.svg' },
  { code: 'pl', name: 'Polski', icon: 'img/flag/pl.svg' },
  { code: 'de', name: 'Deutsch', icon: 'img/flag/de.svg' },
  { code: 'fr', name: 'Français', icon: 'img/flag/fr.svg' },
  { code: 'es', name: 'Español', icon: 'img/flag/es.svg' },
  { code: 'it', name: 'Italiano', icon: 'img/flag/it.svg' },
  { code: 'pt', name: 'Português', icon: 'img/flag/pt.svg' },
  { code: 'sl', name: 'Slovenščina', icon: 'img/flag/sl.svg' },
  { code: 'hu', name: 'Magyar', icon: 'img/flag/hu.svg' },
  { code: 'uk', name: 'Українська', icon: 'img/flag/uk.svg' },
  { code: 'ru', name: 'Русский', icon: 'img/flag/ru.svg' },
  { code: 'sv', name: 'Svenska', icon: 'img/flag/sv.svg' },
  { code: 'et', name: 'Eesti', icon: 'img/flag/et.svg' },
  { code: 'lt', name: 'Lietuvių', icon: 'img/flag/lt.svg' },
  { code: 'lv', name: 'Latviešu', icon: 'img/flag/lv.svg' },
  { code: 'zh-CN', name: '中文 (简体)', icon: '' },
];

// OpenAI voices — language-agnostic, available for all
const OPENAI_VOICES: TtsVoiceOption[] = [
  { name: 'Fable', code: 'fable', gender: 'F', provider: 'openai' },
  { name: 'Alloy', code: 'alloy', gender: 'F', provider: 'openai' },
  { name: 'Echo', code: 'echo', gender: 'M', provider: 'openai' },
  { name: 'Onyx', code: 'onyx', gender: 'M', provider: 'openai' },
  { name: 'Nova', code: 'nova', gender: 'F', provider: 'openai' },
  { name: 'Shimmer', code: 'shimmer', gender: 'F', provider: 'openai' },
];

// Google Cloud TTS voices — language-specific
const GOOGLE_VOICES: Record<string, TtsVoiceOption[]> = {
  cs: [
    { name: 'Wavenet A', code: 'cs-CZ-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'Standard A', code: 'cs-CZ-Standard-A', gender: 'F', provider: 'google' },
  ],
  sk: [
    { name: 'Wavenet A', code: 'sk-SK-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'Standard A', code: 'sk-SK-Standard-A', gender: 'F', provider: 'google' },
  ],
  en: [
    { name: 'Wavenet A', code: 'en-US-Wavenet-A', gender: 'M', provider: 'google' },
    { name: 'Wavenet B', code: 'en-US-Wavenet-B', gender: 'M', provider: 'google' },
    { name: 'Wavenet C', code: 'en-US-Wavenet-C', gender: 'F', provider: 'google' },
    { name: 'Wavenet D', code: 'en-US-Wavenet-D', gender: 'M', provider: 'google' },
    { name: 'Wavenet E', code: 'en-US-Wavenet-E', gender: 'F', provider: 'google' },
    { name: 'Wavenet F', code: 'en-US-Wavenet-F', gender: 'F', provider: 'google' },
    { name: 'Neural2 A', code: 'en-US-Neural2-A', gender: 'M', provider: 'google' },
    { name: 'Neural2 C', code: 'en-US-Neural2-C', gender: 'F', provider: 'google' },
    { name: 'Neural2 D', code: 'en-US-Neural2-D', gender: 'M', provider: 'google' },
    { name: 'Neural2 E', code: 'en-US-Neural2-E', gender: 'F', provider: 'google' },
    { name: 'Neural2 F', code: 'en-US-Neural2-F', gender: 'F', provider: 'google' },
    { name: 'Studio O', code: 'en-US-Studio-O', gender: 'F', provider: 'google' },
    { name: 'Studio Q', code: 'en-US-Studio-Q', gender: 'M', provider: 'google' },
    { name: 'Standard A', code: 'en-US-Standard-A', gender: 'M', provider: 'google' },
    { name: 'Standard C', code: 'en-US-Standard-C', gender: 'F', provider: 'google' },
    { name: 'GB Wavenet A', code: 'en-GB-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'GB Wavenet B', code: 'en-GB-Wavenet-B', gender: 'M', provider: 'google' },
    { name: 'GB Neural2 A', code: 'en-GB-Neural2-A', gender: 'F', provider: 'google' },
    { name: 'GB Neural2 B', code: 'en-GB-Neural2-B', gender: 'M', provider: 'google' },
  ],
  pl: [
    { name: 'Wavenet A', code: 'pl-PL-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'Wavenet B', code: 'pl-PL-Wavenet-B', gender: 'M', provider: 'google' },
    { name: 'Wavenet C', code: 'pl-PL-Wavenet-C', gender: 'M', provider: 'google' },
    { name: 'Wavenet D', code: 'pl-PL-Wavenet-D', gender: 'F', provider: 'google' },
    { name: 'Standard A', code: 'pl-PL-Standard-A', gender: 'F', provider: 'google' },
    { name: 'Standard B', code: 'pl-PL-Standard-B', gender: 'M', provider: 'google' },
  ],
  de: [
    { name: 'Wavenet A', code: 'de-DE-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'Wavenet B', code: 'de-DE-Wavenet-B', gender: 'M', provider: 'google' },
    { name: 'Wavenet C', code: 'de-DE-Wavenet-C', gender: 'F', provider: 'google' },
    { name: 'Wavenet D', code: 'de-DE-Wavenet-D', gender: 'M', provider: 'google' },
    { name: 'Neural2 A', code: 'de-DE-Neural2-A', gender: 'F', provider: 'google' },
    { name: 'Neural2 B', code: 'de-DE-Neural2-B', gender: 'M', provider: 'google' },
    { name: 'Standard A', code: 'de-DE-Standard-A', gender: 'F', provider: 'google' },
    { name: 'Standard B', code: 'de-DE-Standard-B', gender: 'M', provider: 'google' },
  ],
  fr: [
    { name: 'Wavenet A', code: 'fr-FR-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'Wavenet B', code: 'fr-FR-Wavenet-B', gender: 'M', provider: 'google' },
    { name: 'Wavenet C', code: 'fr-FR-Wavenet-C', gender: 'F', provider: 'google' },
    { name: 'Wavenet D', code: 'fr-FR-Wavenet-D', gender: 'M', provider: 'google' },
    { name: 'Neural2 A', code: 'fr-FR-Neural2-A', gender: 'F', provider: 'google' },
    { name: 'Neural2 B', code: 'fr-FR-Neural2-B', gender: 'M', provider: 'google' },
    { name: 'Standard A', code: 'fr-FR-Standard-A', gender: 'F', provider: 'google' },
    { name: 'Standard B', code: 'fr-FR-Standard-B', gender: 'M', provider: 'google' },
  ],
  es: [
    { name: 'Wavenet B', code: 'es-ES-Wavenet-B', gender: 'M', provider: 'google' },
    { name: 'Neural2 A', code: 'es-ES-Neural2-A', gender: 'F', provider: 'google' },
    { name: 'Standard A', code: 'es-ES-Standard-A', gender: 'F', provider: 'google' },
  ],
  it: [
    { name: 'Wavenet A', code: 'it-IT-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'Wavenet B', code: 'it-IT-Wavenet-B', gender: 'F', provider: 'google' },
    { name: 'Wavenet C', code: 'it-IT-Wavenet-C', gender: 'M', provider: 'google' },
    { name: 'Wavenet D', code: 'it-IT-Wavenet-D', gender: 'M', provider: 'google' },
    { name: 'Standard A', code: 'it-IT-Standard-A', gender: 'F', provider: 'google' },
  ],
  pt: [
    { name: 'Wavenet A', code: 'pt-PT-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'Wavenet B', code: 'pt-PT-Wavenet-B', gender: 'M', provider: 'google' },
    { name: 'Standard A', code: 'pt-PT-Standard-A', gender: 'F', provider: 'google' },
  ],
  sl: [
    { name: 'Standard A', code: 'sl-SI-Standard-A', gender: 'F', provider: 'google' },
  ],
  hu: [
    { name: 'Wavenet A', code: 'hu-HU-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'Standard A', code: 'hu-HU-Standard-A', gender: 'F', provider: 'google' },
  ],
  uk: [
    { name: 'Wavenet A', code: 'uk-UA-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'Standard A', code: 'uk-UA-Standard-A', gender: 'F', provider: 'google' },
  ],
  ru: [
    { name: 'Wavenet A', code: 'ru-RU-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'Wavenet B', code: 'ru-RU-Wavenet-B', gender: 'M', provider: 'google' },
    { name: 'Wavenet C', code: 'ru-RU-Wavenet-C', gender: 'F', provider: 'google' },
    { name: 'Wavenet D', code: 'ru-RU-Wavenet-D', gender: 'M', provider: 'google' },
    { name: 'Standard A', code: 'ru-RU-Standard-A', gender: 'F', provider: 'google' },
  ],
  sv: [
    { name: 'Wavenet A', code: 'sv-SE-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'Standard A', code: 'sv-SE-Standard-A', gender: 'F', provider: 'google' },
  ],
  et: [
    { name: 'Standard A', code: 'et-EE-Standard-A', gender: 'F', provider: 'google' },
  ],
  lt: [
    { name: 'Standard A', code: 'lt-LT-Standard-A', gender: 'M', provider: 'google' },
  ],
  lv: [
    { name: 'Standard A', code: 'lv-LV-Standard-A', gender: 'F', provider: 'google' },
  ],
  'zh-CN': [
    { name: 'Wavenet A', code: 'cmn-CN-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'Wavenet B', code: 'cmn-CN-Wavenet-B', gender: 'M', provider: 'google' },
    { name: 'Standard A', code: 'cmn-CN-Standard-A', gender: 'F', provider: 'google' },
    { name: 'Standard B', code: 'cmn-CN-Standard-B', gender: 'M', provider: 'google' },
  ],
};

const SAMPLE_TEXTS: Record<string, string> = {
  cs: 'Bylo nebylo, v daleké zemi žil jeden král, který měl tři syny.',
  sk: 'Bolo raz, v ďalekej krajine žil jeden kráľ, ktorý mal troch synov.',
  en: 'Once upon a time, in a faraway land, there lived a king who had three sons.',
  pl: 'Dawno, dawno temu, w odległej krainie, żył sobie król, który miał trzech synów.',
  de: 'Es war einmal, in einem fernen Land, lebte ein König, der drei Söhne hatte.',
  fr: 'Il était une fois, dans un pays lointain, un roi qui avait trois fils.',
  es: 'Érase una vez, en una tierra lejana, vivía un rey que tenía tres hijos.',
  it: 'C\'era una volta, in una terra lontana, un re che aveva tre figli.',
  pt: 'Era uma vez, numa terra distante, vivia um rei que tinha três filhos.',
  sl: 'Nekoč, v daljni deželi, je živel kralj, ki je imel tri sinove.',
  hu: 'Egyszer volt, hol nem volt, egy távoli országban élt egy király, akinek három fia volt.',
  uk: 'Жив колись у далекій країні один король, і було в нього три сини.',
  ru: 'Жил-был в далёкой стране один король, и было у него три сына.',
  sv: 'Det var en gång, i ett fjärran land, en kung som hade tre söner.',
  et: 'Elas kord kauges maal kuningas, kellel oli kolm poega.',
  lt: 'Seniai seniai, tolimame krašte, gyveno karalius, kuris turėjo tris sūnus.',
  lv: 'Reiz tālā zemē dzīvoja karalis, kuram bija trīs dēli.',
  'zh-CN': '从前，在一个遥远的国度，住着一位国王，他有三个儿子。',
};

interface VoiceGroup {
  provider: string;
  voices: TtsVoiceOption[];
}

@Component({
  selector: 'app-settings-read-section',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, LanguageBadgeComponent, ClickOutsideDirective],
  templateUrl: './settings-read-section.component.html',
  styleUrl: './settings-read-section.component.scss'
})
export class SettingsReadSectionComponent implements OnInit {
  @Input() settings!: Settings;
  @Output() settingsChange = new EventEmitter<Settings>();

  private translationService = inject(AppTranslationService);
  private aiApiService = inject(AiApiService);

  allLanguages = TTS_LANGUAGES;
  voiceEntries: TtsVoiceEntry[] = [];
  addLangDropdownOpen = false;
  voiceDropdownOpenIndex = -1;
  previewingIndex = -1;
  previewingVoice: string | null = null;
  private previewAudio = new Audio();

  get availableLanguages(): TtsLanguage[] {
    const usedCodes = new Set(this.voiceEntries.map(e => e.langCode));
    return this.allLanguages.filter(l => !usedCodes.has(l.code));
  }

  ngOnInit(): void {
    if (this.settings.ttsVoices?.length) {
      this.voiceEntries = this.settings.ttsVoices.map(v => ({ ...v }));
    }
    // Ensure primary exists — defaults to app UI language
    if (!this.voiceEntries.some(e => e.isPrimary)) {
      const appLang = this.translationService.currentLanguage().code;
      const existing = this.voiceEntries.find(e => e.langCode === appLang);
      if (existing) {
        existing.isPrimary = true;
      } else {
        this.voiceEntries.unshift({
          langCode: appLang,
          voice: 'fable',
          provider: 'openai',
          isPrimary: true
        });
      }
      this.emitChange();
    }
  }

  getLanguage(code: string): TtsLanguage {
    return this.allLanguages.find(l => l.code === code) || { code, name: code, icon: '' };
  }

  getVoiceGroupsForLang(langCode: string): VoiceGroup[] {
    const groups: VoiceGroup[] = [
      { provider: 'OpenAI', voices: OPENAI_VOICES },
    ];
    const googleVoices = GOOGLE_VOICES[langCode];
    if (googleVoices?.length) {
      groups.push({ provider: 'Google', voices: googleVoices });
    }
    return groups;
  }

  getAllVoicesForLang(langCode: string): TtsVoiceOption[] {
    const google = GOOGLE_VOICES[langCode] || [];
    return [...OPENAI_VOICES, ...google];
  }

  getSelectedVoiceLabel(entry: TtsVoiceEntry): string {
    if (!entry.voice) return '—';
    const allVoices = this.getAllVoicesForLang(entry.langCode);
    const v = allVoices.find(vo => vo.code === entry.voice);
    if (v) {
      return v.gender ? `${v.name} (${v.gender})` : v.name;
    }
    return entry.voice;
  }

  selectVoice(index: number, voice: TtsVoiceOption): void {
    this.voiceEntries[index].voice = voice.code;
    this.voiceEntries[index].provider = voice.provider;
    this.voiceDropdownOpenIndex = -1;
    this.emitChange();
  }

  toggleVoiceDropdown(index: number): void {
    this.voiceDropdownOpenIndex = this.voiceDropdownOpenIndex === index ? -1 : index;
  }

  closeVoiceDropdown(): void {
    this.voiceDropdownOpenIndex = -1;
  }

  addLanguage(lang: TtsLanguage): void {
    this.voiceEntries.push({
      langCode: lang.code,
      voice: 'fable',
      provider: 'openai',
      isPrimary: false
    });
    this.addLangDropdownOpen = false;
    this.emitChange();
  }

  setPrimary(index: number): void {
    this.voiceEntries.forEach((e, i) => {
      e.isPrimary = i === index;
    });
    this.emitChange();
  }

  removeEntry(index: number): void {
    const entry = this.voiceEntries[index];
    if (entry.isPrimary) return;
    this.voiceEntries.splice(index, 1);
    this.emitChange();
  }

  previewVoice(index: number): void {
    const entry = this.voiceEntries[index];
    if (!entry.voice) return;
    if (this.previewingIndex === index) {
      this.previewAudio.pause();
      this.previewingIndex = -1;
      return;
    }

    this.previewingIndex = index;
    const sampleText = SAMPLE_TEXTS[entry.langCode] || SAMPLE_TEXTS['en'];
    const provider: TtsProvider = entry.provider || 'google';

    this.aiApiService.textToSpeech(sampleText, entry.langCode, provider, entry.voice)
      .pipe(take(1))
      .subscribe({
        next: (audioContent) => {
          const binaryString = atob(audioContent);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'audio/mpeg' });
          if (this.previewAudio.src?.startsWith('blob:')) {
            URL.revokeObjectURL(this.previewAudio.src);
          }
          this.previewAudio.src = URL.createObjectURL(blob);
          this.previewAudio.onended = () => { this.previewingIndex = -1; };
          this.previewAudio.play().catch(() => { this.previewingIndex = -1; });
        },
        error: () => { this.previewingIndex = -1; }
      });
  }

  previewVoiceOption(entry: TtsVoiceEntry, voice: TtsVoiceOption, event: Event): void {
    event.stopPropagation();

    if (this.previewingVoice === voice.code) {
      this.previewAudio.pause();
      this.previewingVoice = null;
      return;
    }

    this.previewingVoice = voice.code;
    const sampleText = SAMPLE_TEXTS[entry.langCode] || SAMPLE_TEXTS['en'];

    this.aiApiService.textToSpeech(sampleText, entry.langCode, voice.provider, voice.code)
      .pipe(take(1))
      .subscribe({
        next: (audioContent) => {
          const binaryString = atob(audioContent);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'audio/mpeg' });
          if (this.previewAudio.src?.startsWith('blob:')) {
            URL.revokeObjectURL(this.previewAudio.src);
          }
          this.previewAudio.src = URL.createObjectURL(blob);
          this.previewAudio.onended = () => { this.previewingVoice = null; };
          this.previewAudio.play().catch(() => { this.previewingVoice = null; });
        },
        error: () => { this.previewingVoice = null; }
      });
  }

  private emitChange(): void {
    const updated = { ...this.settings, ttsVoices: this.voiceEntries.map(v => ({ ...v })) };
    this.settingsChange.emit(updated as Settings);
  }
}
