import {computed, inject, Injectable, signal} from '@angular/core';
import {Observable, Subject} from 'rxjs';
import {AppTranslationService} from '../translation/app-translation.service';

const LANG_TO_SPEECH_LOCALE: Record<string, string> = {
  sk: 'sk-SK',
  cs: 'cs-CZ',
  en: 'en-US',
  pl: 'pl-PL',
};

@Injectable({
  providedIn: 'root'
})
export class SpeechRecognitionService {

  private translationService = inject(AppTranslationService);
  private recognition: any = null;
  private result$ = new Subject<string>();

  isListening = signal(false);

  private speechLang = computed(() => {
    const code = this.translationService.currentLanguage().code;
    return LANG_TO_SPEECH_LOCALE[code] ?? 'en-US';
  });

  get isSupported(): boolean {
    return !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
  }

  start(): Observable<string> {
    if (!this.isSupported) {
      console.warn('Speech Recognition API is not supported in this browser.');
      return this.result$.asObservable();
    }

    if (this.isListening()) {
      this.stop();
      return this.result$.asObservable();
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.lang = this.speechLang();
    this.recognition.interimResults = false;
    this.recognition.continuous = false;

    this.recognition.onresult = (event: any) => {
      const transcript: string = event.results[0][0].transcript;
      this.result$.next(transcript);
    };

    this.recognition.onend = () => {
      this.isListening.set(false);
    };

    this.recognition.onerror = () => {
      this.isListening.set(false);
    };

    this.isListening.set(true);
    this.recognition.start();

    return this.result$.asObservable();
  }

  stop() {
    this.recognition?.stop();
    this.isListening.set(false);
  }

  toggle(): Observable<string> {
    if (this.isListening()) {
      this.stop();
    } else {
      this.start();
    }
    return this.result$.asObservable();
  }
}
