import { Component, EventEmitter, inject, Input, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TtsVoiceEntry } from '../../../settings.model';
import { AiApiService, TtsProvider } from '../../../../../shared/services/ai-api.service';
import { ClickOutsideDirective } from '../../../../../shared/directives/click-outside';
import { take } from 'rxjs/operators';
import { TtsVoiceOption, VoiceGroup, SAMPLE_TEXTS, getVoiceGroups } from '../tts-voices.data';

@Component({
  selector: 'app-tts-voice-dropdown',
  standalone: true,
  imports: [CommonModule, ClickOutsideDirective],
  templateUrl: './tts-voice-dropdown.component.html',
  styleUrl: './tts-voice-dropdown.component.scss'
})
export class TtsVoiceDropdownComponent implements OnDestroy {
  @Input({ required: true }) entry!: TtsVoiceEntry;
  @Input({ required: true }) label!: string;
  @Output() voiceChange = new EventEmitter<TtsVoiceOption>();

  private aiApiService = inject(AiApiService);

  expanded = false;
  previewingVoice: string | null = null;
  private audio = new Audio();

  get voiceGroups(): VoiceGroup[] {
    return getVoiceGroups(this.entry.langCode);
  }

  toggle(): void {
    this.expanded = !this.expanded;
  }

  close(): void {
    this.expanded = false;
  }

  select(voice: TtsVoiceOption): void {
    this.expanded = false;
    this.voiceChange.emit(voice);
  }

  previewVoice(voice: TtsVoiceOption, event: Event): void {
    event.stopPropagation();

    if (this.previewingVoice === voice.code) {
      this.audio.pause();
      this.previewingVoice = null;
      return;
    }

    this.previewingVoice = voice.code;
    const sampleText = SAMPLE_TEXTS[this.entry.langCode] || SAMPLE_TEXTS['en'];

    this.aiApiService.textToSpeech(sampleText, this.entry.langCode, voice.provider as TtsProvider, voice.code)
      .pipe(take(1))
      .subscribe({
        next: (audioContent) => this.playAudio(audioContent, () => { this.previewingVoice = null; }),
        error: () => { this.previewingVoice = null; }
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

  ngOnDestroy(): void {
    this.audio.pause();
    if (this.audio.src?.startsWith('blob:')) {
      URL.revokeObjectURL(this.audio.src);
    }
  }
}
