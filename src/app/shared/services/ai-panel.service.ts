import { Injectable, inject, signal, computed } from '@angular/core';
import { AltoService } from './alto.service';
import { AiApiService, AI_MODELS, AiModel, TranslateProvider } from './ai-api.service';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

export type AiPanelContentType = 'translation' | 'summary' | 'text' | null;
export type AiPanelMode = 'split' | 'ai-only';

@Injectable({ providedIn: 'root' })
export class AiPanelService {

  private altoService = inject(AltoService);
  private aiApiService = inject(AiApiService);
  private activeSubscription: Subscription | null = null;

  // --- State ---
  readonly panelVisible = signal(false);
  readonly panelMode = signal<AiPanelMode>('ai-only');
  readonly contentType = signal<AiPanelContentType>(null);
  readonly content = signal<string>('');
  readonly styledHtml = signal<string>('');
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  // UI state
  readonly showOriginal = signal(false);
  readonly fontSize = signal(14);
  readonly currentPagePid = signal<string | null>(null);

  // Settings
  readonly selectedModel = signal<AiModel>(AI_MODELS[1]); // gpt-4o-mini
  readonly translateProvider = signal<TranslateProvider>('google');
  readonly targetLanguage = signal<string>('cs');

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
    if (!isReload && !this.showOriginal()) {
      this.panelMode.set('ai-only');
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
            this.error.set(err.message || 'Translation failed');
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
    if (!isReload && !this.showOriginal()) {
      this.panelMode.set('ai-only');
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

        const instructions = 'You are a helpful assistant. Summarize the following text concisely. Keep the summary in the same language as the original text.';
        this.activeSubscription = this.aiApiService.askLLM(text, instructions, this.selectedModel(), 2000).pipe(take(1)).subscribe({
          next: (summary) => {
            this.styledHtml.set('');
            this.content.set(summary);
            this.isLoading.set(false);
          },
          error: (err) => {
            this.isLoading.set(false);
            this.error.set(err.message || 'Summary failed');
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
    this.showOriginal.set(false);
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
    if (current < 28) this.fontSize.set(current + 2);
  }

  decreaseFontSize(): void {
    const current = this.fontSize();
    if (current > 10) this.fontSize.set(current - 2);
  }

  private cancelPending(): void {
    if (this.activeSubscription) {
      this.activeSubscription.unsubscribe();
      this.activeSubscription = null;
    }
  }
}
