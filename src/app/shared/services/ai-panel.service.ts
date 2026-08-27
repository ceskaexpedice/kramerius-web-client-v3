import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { AltoService } from './alto.service';
import { AiApiService, AI_MODELS, AiModel, TranslateProvider, isQuotaExceeded } from './ai-api.service';
import { LocalStorageService } from './local-storage.service';
import { TranslateService } from '@ngx-translate/core';
import { TRANSLATION_LANGUAGES } from '../translation/translation-languages';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

const AI_PANEL_FONT_SIZE_KEY = 'ai-panel-font-size';
const DEFAULT_FONT_SIZE = 16;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 28;

export type AiPanelContentType = 'translation' | 'summary' | 'text' | null;
export type AiPanelMode = 'split' | 'ai-only';

@Injectable({ providedIn: 'root' })
export class AiPanelService {

  private altoService = inject(AltoService);
  private aiApiService = inject(AiApiService);
  private localStorageService = inject(LocalStorageService);
  private translate = inject(TranslateService);
  private activeSubscription: Subscription | null = null;

  constructor() {
    effect(() => {
      this.localStorageService.set(AI_PANEL_FONT_SIZE_KEY, this.fontSize());
    });
  }

  // --- State ---
  readonly panelVisible = signal(false);
  readonly panelMode = signal<AiPanelMode>('ai-only');
  readonly contentType = signal<AiPanelContentType>(null);
  readonly content = signal<string>('');
  readonly styledHtml = signal<string>('');
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  // UI state
  readonly showOriginal = signal(true);
  readonly fontSize = signal(this.loadFontSize());
  readonly currentPagePid = signal<string | null>(null);

  // Settings
  readonly selectedModel = signal<AiModel>(AI_MODELS[1]); // gpt-4o-mini
  readonly translateProvider = signal<TranslateProvider>('google');
  readonly targetLanguage = signal<string>('cs');
  /**
   * Language the summary is produced in. Defaults to the UI language, since a
   * summary in a language the reader does not know is of no use (issue #161).
   */
  readonly summaryLanguage = signal<string>(this.defaultSummaryLanguage());

  // Computed: panel mode driven by showOriginal toggle
  readonly effectivePanelMode = computed<AiPanelMode>(() =>
    this.showOriginal() ? 'split' : 'ai-only'
  );

  // --- Actions ---

  showTranslation(pagePid: string, targetLang?: string): void {
    const lang = targetLang || this.targetLanguage();
    const isReload = this.panelVisible() && this.contentType() === 'translation';
    this.cancelPending();
    this.panelVisible.set(true);
    if (!isReload) {
      this.panelMode.set(this.showOriginal() ? 'split' : 'ai-only');
    }
    this.contentType.set('translation');
    this.content.set('');
    this.isLoading.set(true);
    this.error.set(null);
    this.currentPagePid.set(pagePid);

    this.activeSubscription = this.altoService.fetchAltoXml(pagePid).pipe(take(1)).subscribe({
      next: (altoXml) => {
        const text = this.altoService.getFullText(altoXml);
        if (!text) {
          this.isLoading.set(false);
          this.error.set('No text found on this page');
          return;
        }

        // Translate styled HTML to preserve formatting
        const html = this.altoService.getStyledHtml(altoXml);
        const inputToTranslate = html || text;
        const format = html ? 'html' as const : 'text' as const;

        this.activeSubscription = this.aiApiService.translate(inputToTranslate, lang, this.translateProvider(), format).pipe(take(1)).subscribe({
          next: (translated) => {
            if (format === 'html') {
              this.styledHtml.set(translated);
              this.content.set('');
            } else {
              this.styledHtml.set('');
              this.content.set(translated);
            }
            this.isLoading.set(false);
          },
          error: (err) => {
            this.isLoading.set(false);
            this.error.set(this.describeError(err, 'Translation failed'));
          }
        });
      },
      error: () => {
        this.isLoading.set(false);
        this.error.set('Failed to load page text');
      }
    });
  }

  showSummary(pagePid: string): void {
    const isReload = this.panelVisible() && this.contentType() === 'summary';
    this.cancelPending();
    this.panelVisible.set(true);
    if (!isReload) {
      this.panelMode.set(this.showOriginal() ? 'split' : 'ai-only');
    }
    this.contentType.set('summary');
    this.content.set('');
    this.isLoading.set(true);
    this.error.set(null);
    this.currentPagePid.set(pagePid);

    this.activeSubscription = this.altoService.fetchAltoXml(pagePid).pipe(take(1)).subscribe({
      next: (altoXml) => {
        const text = this.altoService.getFullText(altoXml);
        if (!text) {
          this.isLoading.set(false);
          this.error.set('No text found on this page');
          return;
        }

        const instructions = this.buildSummaryInstructions(this.summaryLanguage());
        this.activeSubscription = this.aiApiService.askLLM(text, instructions, this.selectedModel(), 2000).pipe(take(1)).subscribe({
          next: (summary) => {
            this.styledHtml.set('');
            this.content.set(summary);
            this.isLoading.set(false);
          },
          error: (err) => {
            this.isLoading.set(false);
            this.error.set(this.describeError(err, 'Summary failed'));
          }
        });
      },
      error: () => {
        this.isLoading.set(false);
        this.error.set('Failed to load page text');
      }
    });
  }

  showText(text: string, pagePid?: string): void {
    this.cancelPending();
    this.panelVisible.set(true);
    this.showOriginal.set(true);
    this.panelMode.set('split');
    this.contentType.set('text');
    this.styledHtml.set('');
    this.content.set(text);
    this.isLoading.set(false);
    this.error.set(null);
    if (pagePid) this.currentPagePid.set(pagePid);
  }

  showPageText(pagePid: string): void {
    this.cancelPending();
    this.panelVisible.set(true);
    this.showOriginal.set(true);
    this.panelMode.set('split');
    this.contentType.set('text');
    this.content.set('');
    this.styledHtml.set('');
    this.isLoading.set(true);
    this.error.set(null);
    this.currentPagePid.set(pagePid);

    this.activeSubscription = this.altoService.fetchAltoXml(pagePid).pipe(take(1)).subscribe({
      next: (altoXml) => {
        const text = this.altoService.getFullText(altoXml);
        this.isLoading.set(false);
        if (!text) {
          this.error.set('No text found on this page');
          return;
        }
        const html = this.altoService.getStyledHtml(altoXml);
        if (html) {
          this.styledHtml.set(html);
        } else {
          this.content.set(text);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.error.set('Failed to load page text');
      }
    });
  }

  resummarize(language: string): void {
    const pid = this.currentPagePid();
    if (!pid) return;
    this.summaryLanguage.set(language);
    this.showSummary(pid);
  }

  /**
   * Names the target language for the model. The language is identified by both
   * its endonym and its code, so the model has an unambiguous target without a
   * separate English-name table to keep in sync. Falls back to the original
   * language, which is the previous behaviour.
   */
  /**
   * Human-readable text for a failed AI call.
   *
   * Quota exhaustion gets a localized explanation — it is an expected, recurring
   * state the user can act on (wait for the monthly reset), not a glitch. Other
   * failures keep the previous behaviour of showing the raw error message.
   */
  private describeError(err: unknown, fallback: string): string {
    if (isQuotaExceeded(err)) {
      return this.translate.instant('ai.quota-exceeded');
    }
    return (err as { message?: string } | null)?.message || fallback;
  }

  private buildSummaryInstructions(languageCode: string): string {
    const language = TRANSLATION_LANGUAGES.find(l => l.code === languageCode);
    const target = language
      ? `Write the summary in ${language.name} (language code: ${language.code}), regardless of the language of the source text.`
      : 'Keep the summary in the same language as the original text.';
    return `You are a helpful assistant. Summarize the following text concisely. ${target}`;
  }

  /** The UI language when it is one we can ask for, otherwise Czech. */
  private defaultSummaryLanguage(): string {
    const uiLang = this.translate.getCurrentLang() || this.translate.getDefaultLang() || '';
    return TRANSLATION_LANGUAGES.some(l => l.code === uiLang) ? uiLang : 'cs';
  }

  retranslate(targetLang: string): void {
    const pid = this.currentPagePid();
    if (!pid) return;
    this.targetLanguage.set(targetLang);
    this.showTranslation(pid, targetLang);
  }

  close(): void {
    this.cancelPending();
    this.panelVisible.set(false);
    this.panelMode.set('ai-only');
    this.showOriginal.set(true);
    this.contentType.set(null);
    this.content.set('');
    this.styledHtml.set('');
    this.isLoading.set(false);
    this.error.set(null);
    this.currentPagePid.set(null);
  }

  toggleOriginal(): void {
    const show = !this.showOriginal();
    this.showOriginal.set(show);
    this.panelMode.set(show ? 'split' : 'ai-only');
  }

  increaseFontSize(): void {
    const current = this.fontSize();
    if (current < MAX_FONT_SIZE) this.fontSize.set(current + 2);
  }

  decreaseFontSize(): void {
    const current = this.fontSize();
    if (current > MIN_FONT_SIZE) this.fontSize.set(current - 2);
  }

  private loadFontSize(): number {
    const saved = this.localStorageService.get<number>(AI_PANEL_FONT_SIZE_KEY);
    if (typeof saved === 'number' && saved >= MIN_FONT_SIZE && saved <= MAX_FONT_SIZE) {
      return saved;
    }
    return DEFAULT_FONT_SIZE;
  }

  private cancelPending(): void {
    if (this.activeSubscription) {
      this.activeSubscription.unsubscribe();
      this.activeSubscription = null;
    }
  }
}
