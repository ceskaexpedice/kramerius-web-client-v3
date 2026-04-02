import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpContext } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';
import { SKIP_ERROR_INTERCEPTOR } from '../../core/services/http-context-tokens';

export interface AiModel {
  provider: 'openai' | 'anthropic' | 'google';
  name: string;
  code: string;
}

export type TtsProvider = 'openai' | 'google' | 'elevenlabs';
export type TranslateProvider = 'google' | 'deepl';

export const AI_MODELS: AiModel[] = [
  { provider: 'openai', name: 'GPT 4o', code: 'gpt-4o' },
  { provider: 'openai', name: 'GPT 4o mini', code: 'gpt-4o-mini' },
  { provider: 'anthropic', name: 'Claude 3.5 Haiku', code: 'claude-3-5-haiku-20241022' },
  { provider: 'anthropic', name: 'Claude 3.5 Sonnet', code: 'claude-3-5-sonnet-20241022' },
  { provider: 'google', name: 'Gemini 2.0 Flash', code: 'gemini-2.0-flash-exp' },
  { provider: 'google', name: 'Gemini 1.5 Pro', code: 'gemini-1.5-pro' },
];

@Injectable({ providedIn: 'root' })
export class AiApiService {

  private readonly baseUrl = 'https://api.trinera.cloud/api';
  private readonly temperature = 0;

  private http = inject(HttpClient);
  private authService = inject(AuthService);

  // --- TTS ---

  elevenLabsTTS(text: string, voice: string): Observable<string> {
    const body = { model_id: 'eleven_multilingual_v2', text };
    return this.post<{ audioContent: string }>(`/elevenlabs/tts/${voice}`, body).pipe(
      map(r => r.audioContent)
    );
  }

  openAiTTS(text: string, voice: string): Observable<string> {
    const body = { model: 'tts-1', voice, input: text };
    return this.post<{ audioContent: string }>('/openai/tts', body).pipe(
      map(r => r.audioContent)
    );
  }

  googleTTS(text: string, voice: string, language: string): Observable<string> {
    const body = {
      audioConfig: {
        audioEncoding: 'MP3',
        effectsProfileId: ['small-bluetooth-speaker-class-device'],
        pitch: 0,
        speakingRate: 1
      },
      input: { text: text.toLocaleLowerCase() },
      voice: { languageCode: language, name: voice }
    };
    return this.post<{ audioContent: string }>('/google/tts', body).pipe(
      map(r => r.audioContent)
    );
  }

  textToSpeech(text: string, language: string, provider: TtsProvider = 'google', voice?: string): Observable<string> {
    switch (provider) {
      case 'elevenlabs':
        return this.elevenLabsTTS(text, voice || 'EXAVITQu4vr4xnSDxMaL');
      case 'openai':
        return this.openAiTTS(text, voice || 'alloy');
      case 'google':
      default: {
        // Google TTS requires full locale codes (e.g. cs-CZ, en-US, sk-SK, pl-PL)
        const locale = this.toGoogleLocale(language);
        return this.googleTTS(text, voice || `${locale}-Standard-A`, locale);
      }
    }
  }

  // --- Translation ---

  translateWithGoogle(input: string, targetLanguage: string, format: 'text' | 'html' = 'text'): Observable<string> {
    const body = { q: [input], target: targetLanguage, format };
    return this.post<any>('/google/translate', body).pipe(
      map(r => r.data.translations[0].translatedText)
    );
  }

  translateWithDeepL(input: string, targetLanguage: string, tagHandling?: 'html'): Observable<string> {
    const body: any = { text: [input], target_lang: targetLanguage };
    if (tagHandling) body.tag_handling = tagHandling;
    return this.post<any>('/deepl/translate', body).pipe(
      map(r => r.translations[0].text)
    );
  }

  translate(input: string, targetLanguage: string, provider: TranslateProvider = 'google', format: 'text' | 'html' = 'text'): Observable<string> {
    if (provider === 'deepl') {
      return this.translateWithDeepL(input, targetLanguage, format === 'html' ? 'html' : undefined);
    }
    return this.translateWithGoogle(input, targetLanguage, format);
  }

  // --- Language Detection ---

  detectLanguage(input: string): Observable<string> {
    const body = { q: input };
    return this.post<any>('/google/translate/detect', body).pipe(
      map(r => r.data.detections[0][0].language)
    );
  }

  // --- LLM ---

  askLLM(input: string, instructions: string, model?: AiModel, maxTokens: number = 1000): Observable<string> {
    const m = model || AI_MODELS[1]; // default: gpt-4o-mini
    switch (m.provider) {
      case 'openai':
        return this.askGPT(input, instructions, m.code, maxTokens);
      case 'anthropic':
        return this.askClaude(input, instructions, m.code, maxTokens);
      case 'google':
        return this.askGemini(input, instructions, m.code, maxTokens);
      default:
        return this.askGPT(input, instructions, m.code, maxTokens);
    }
  }

  private askGPT(input: string, instructions: string, model: string, maxTokens: number): Observable<string> {
    const body = {
      model,
      messages: [
        { role: 'system', content: instructions },
        { role: 'user', content: input }
      ],
      temperature: this.temperature,
      max_tokens: maxTokens
    };
    return this.post<any>('/openai/chat/completions', body).pipe(
      map(r => r.choices[0].message.content)
    );
  }

  private askClaude(input: string, instructions: string, model: string, maxTokens: number): Observable<string> {
    const body = {
      model,
      messages: [
        { role: 'user', content: `${instructions}\n\n${input}` }
      ],
      temperature: this.temperature,
      max_tokens: maxTokens
    };
    return this.post<any>('/anthropic/messages', body).pipe(
      map(r => r.content[0].text)
    );
  }

  private askGemini(input: string, instructions: string, model: string, maxTokens: number): Observable<string> {
    const body = {
      contents: [
        { role: 'user', parts: [{ text: `${instructions}\n\n${input}` }] }
      ],
      generationConfig: { temperature: this.temperature, maxOutputTokens: maxTokens }
    };
    return this.post<any>(`/google/gemini/${model}`, body).pipe(
      map(r => r.candidates[0].content.parts[0].text)
    );
  }

  // --- Locale Helper ---

  private static readonly LOCALE_MAP: Record<string, string> = {
    cs: 'cs-CZ', sk: 'sk-SK', pl: 'pl-PL', en: 'en-US', de: 'de-DE',
    fr: 'fr-FR', es: 'es-ES', it: 'it-IT', pt: 'pt-PT', ru: 'ru-RU',
    uk: 'uk-UA', hu: 'hu-HU', ro: 'ro-RO', nl: 'nl-NL', sv: 'sv-SE',
    da: 'da-DK', nb: 'nb-NO', fi: 'fi-FI', ja: 'ja-JP', zh: 'zh-CN',
    ko: 'ko-KR', ar: 'ar-XA', hi: 'hi-IN', tr: 'tr-TR', el: 'el-GR',
    bg: 'bg-BG', hr: 'hr-HR', sr: 'sr-RS', sl: 'sl-SI', lt: 'lt-LT',
    lv: 'lv-LV', et: 'et-EE',
  };

  private toGoogleLocale(lang: string): string {
    return AiApiService.LOCALE_MAP[lang] || `${lang}-${lang.toUpperCase()}`;
  }

  // --- HTTP Helper ---

  private post<T>(path: string, body: any): Observable<T> {
    const token = this.authService.getAccessToken();
    if (!token) {
      return throwError(() => new Error('unauthorized'));
    }

    const url = `${this.baseUrl}${path}`;
    const headers = new HttpHeaders()
      .set('X-Tai-Source', location.href)
      .set('X-Tai-Project', 'Kramerius')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json');

    return this.http.post<T>(url, body, {
      headers,
      context: new HttpContext().set(SKIP_ERROR_INTERCEPTOR, true)
    }).pipe(
      catchError(error => {
        let errorCode = 'unknown_error';
        if (error.error?.errorCode) {
          errorCode = error.error.errorCode;
        } else if (error.status === 403 || error.status === 401) {
          errorCode = 'unauthorized';
        }
        return throwError(() => new Error(errorCode));
      })
    );
  }
}
