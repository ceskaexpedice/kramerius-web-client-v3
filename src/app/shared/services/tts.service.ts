import { Injectable, inject, signal, computed } from '@angular/core';
import { AltoService, AltoTextBlock } from './alto.service';
import { AiApiService, TtsProvider, isQuotaExceeded } from './ai-api.service';
import { DetailViewService } from '../../modules/detail-view-page/services/detail-view.service';
import { IIIFViewerService } from './iiif-viewer.service';
import { SettingsService } from '../../modules/settings/settings.service';
import { ToastService } from './toast.service';
import { Observable, of } from 'rxjs';
import { take, switchMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class TtsService {

  private altoService = inject(AltoService);
  private aiApiService = inject(AiApiService);
  private detailViewService = inject(DetailViewService);
  private iiifViewerService = inject(IIIFViewerService);
  private settingsService = inject(SettingsService);
  private toastService = inject(ToastService);

  private audio = new Audio();
  private prefetchedAudio: string | null = null;
  private prefetchingBlockIndex = -1;
  private destroyed = false;
  private isPlayingBlock = false;
  /** True once playback has been unlocked by a user gesture (mobile autoplay policy). */
  private audioUnlocked = false;
  /**
   * Consecutive blocks that failed to produce audio. Advancing on failure is what
   * lets reading skip an unreadable block, but without a ceiling it turns into a
   * runaway "speedrun" through blocks and pages (see issue #161).
   */
  private consecutiveFailures = 0;
  private static readonly MAX_CONSECUTIVE_FAILURES = 3;

  // --- State signals ---
  private _isReading = signal(false);
  private _isPaused = signal(false);
  private _currentBlockIndex = signal(-1);
  private _currentPagePid = signal<string | null>(null);
  private _blocks = signal<AltoTextBlock[]>([]);
  private _detectedLanguage = signal<string | null>(null);
  private _documentUuid = signal<string | null>(null);
  private _playbackBlocked = signal(false);
  private _error = signal<string | null>(null);

  // Public readonly signals
  readonly isReading = this._isReading.asReadonly();
  readonly isPaused = this._isPaused.asReadonly();
  readonly currentBlockIndex = this._currentBlockIndex.asReadonly();
  readonly currentPagePid = this._currentPagePid.asReadonly();
  readonly blocks = this._blocks.asReadonly();
  readonly detectedLanguage = this._detectedLanguage.asReadonly();
  /** Set when the browser refused to play audio, so the UI can prompt for a tap. */
  readonly playbackBlocked = this._playbackBlocked.asReadonly();
  /**
   * Translation key for why reading stopped, or null when it stopped normally.
   * Survives `stop()` so the message stays on screen after playback ends.
   */
  readonly error = this._error.asReadonly();

  readonly currentBlock = computed(() => {
    const blocks = this._blocks();
    const index = this._currentBlockIndex();
    return index >= 0 && index < blocks.length ? blocks[index] : null;
  });

  // TTS settings
  private _provider = signal<TtsProvider>('google');
  private _voice = signal<string | null>(null);

  constructor() {
    this.audio.addEventListener('ended', () => {
      if (this.isPlayingBlock) {
        this.isPlayingBlock = false;
        this.consecutiveFailures = 0;
        this.onBlockEnded();
      }
    });
    this.audio.addEventListener('error', (e) => {
      console.error('TTS audio error:', e);
      if (this.isPlayingBlock) {
        this.isPlayingBlock = false;
        this.onBlockFailed();
      }
    });
  }

  // --- Public API ---

  startReading(pagePid: string, documentUuid?: string): void {
    this.stop();
    // Cleared here rather than in stop(), so the reason for an aborted run
    // survives the stop() that aborting itself performs.
    this._error.set(null);
    // Called from a click handler, so this is inside a user gesture — the one
    // moment a mobile browser lets us prime the audio element (issue #161).
    this.unlockAudio();
    this._currentPagePid.set(pagePid);
    this._documentUuid.set(documentUuid || null);
    this._isReading.set(true);
    this._isPaused.set(false);

    this.loadPageAndRead(pagePid);
  }

  pause(): void {
    if (this._isReading() && !this._isPaused()) {
      this.audio.pause();
      this._isPaused.set(true);
    }
  }

  resume(): void {
    if (!this._isReading() || !this._isPaused()) return;

    // Resuming after a blocked autoplay: the element has no usable source yet,
    // so re-request the current block rather than playing silence.
    if (this._playbackBlocked()) {
      this._playbackBlocked.set(false);
      this._isPaused.set(false);
      this.unlockAudio();
      this.readCurrentBlock();
      return;
    }

    this.audio.play().catch(err => console.error('Failed to resume TTS audio:', err));
    this._isPaused.set(false);
  }

  togglePlayPause(): void {
    if (this._isPaused()) {
      this.resume();
    } else {
      this.pause();
    }
  }

  stop(): void {
    this.isPlayingBlock = false;
    this.audio.pause();
    this.cleanupBlobUrl();
    this.prefetchedAudio = null;
    this.prefetchingBlockIndex = -1;
    this.consecutiveFailures = 0;
    this._playbackBlocked.set(false);

    this._isReading.set(false);
    this._isPaused.set(false);
    this._currentBlockIndex.set(-1);
    this._currentPagePid.set(null);
    this._blocks.set([]);
    this._detectedLanguage.set(null);
    this._documentUuid.set(null);

    this.iiifViewerService.clearTtsHighlight();
  }

  setProvider(provider: TtsProvider): void {
    this._provider.set(provider);
  }

  setVoice(voice: string | null): void {
    this._voice.set(voice);
  }

  /**
   * Check if a specific page is currently being read
   */
  isReadingPage(pagePid: string): boolean {
    return this._isReading() && this._currentPagePid() === pagePid;
  }

  // --- Private methods ---

  /**
   * Primes the audio element inside a user gesture so later programmatic play()
   * calls are allowed. Mobile Safari/Chrome only grant playback permission to an
   * element that has been played during a gesture; the element is constructed in
   * this service's constructor, long before any tap, so without this the very
   * first play() is refused (issue #161).
   */
  private unlockAudio(): void {
    if (this.audioUnlocked) return;

    // A silent WAV is enough to satisfy the gesture requirement.
    this.audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    this.audio.play().then(() => {
      this.audioUnlocked = true;
      // Real block audio may have started while the silent clip was warming up;
      // only rewind the element if it is still the silent clip playing.
      if (!this.isPlayingBlock) {
        this.audio.pause();
        this.audio.currentTime = 0;
      }
    }).catch(() => {
      // Still blocked — playAudioContent surfaces this to the user instead.
    });
  }

  private loadPageAndRead(pagePid: string): void {
    this.altoService.fetchAltoXml(pagePid).pipe(take(1)).subscribe({
      next: (altoXml) => {
        const blocks = this.altoService.getBlocksForReading(altoXml);

        if (blocks.length === 0) {
          // No text on this page, try next page
          this.advanceToNextPage();
          return;
        }

        this._blocks.set(blocks);
        this._currentBlockIndex.set(0);

        // Detect language from first block if not already detected
        if (!this._detectedLanguage()) {
          this.aiApiService.detectLanguage(blocks[0].text).pipe(take(1)).subscribe({
            next: (lang) => {
              this._detectedLanguage.set(lang);
              this.readCurrentBlock();
            },
            error: (err) => {
              // Quota is terminal: every TTS call that follows would fail the
              // same way, so stop here rather than reading on into them.
              if (isQuotaExceeded(err)) {
                this.abortWithError('ai.quota-exceeded');
                return;
              }
              // Default to Czech if detection fails for any other reason
              this._detectedLanguage.set('cs');
              this.readCurrentBlock();
            }
          });
        } else {
          this.readCurrentBlock();
        }
      },
      error: (err) => {
        console.error('Failed to fetch ALTO XML for TTS:', err);
        // Try next page on error
        this.advanceToNextPage();
      }
    });
  }

  private readCurrentBlock(): void {
    if (!this._isReading()) return;

    const blocks = this._blocks();
    const index = this._currentBlockIndex();

    if (index < 0 || index >= blocks.length) {
      // All blocks on this page are done, advance to next page
      this.advanceToNextPage();
      return;
    }

    const block = blocks[index];
    const lang = this._detectedLanguage() || 'cs';
    const { voice, provider, voiceLangCode } = this.resolveVoiceAndProvider(lang);

    // Show highlight on the current block
    this.iiifViewerService.showTtsHighlight(block);

    // Check if we have prefetched audio for this block
    if (this.prefetchedAudio && this.prefetchingBlockIndex === index) {
      this.playAudioContent(this.prefetchedAudio);
      this.prefetchedAudio = null;
      this.prefetchingBlockIndex = -1;
      // Prefetch next block
      this.prefetchNextBlock();
      return;
    }

    // Request TTS for current block (translate first if languages differ)
    this.maybeTranslate(block.text, lang, voiceLangCode).pipe(
      switchMap(text => this.aiApiService.textToSpeech(text, voiceLangCode || lang, provider, voice)),
      take(1)
    ).subscribe({
        next: (audioContent) => {
          if (!this._isReading()) return;
          this.playAudioContent(audioContent);
          // Start prefetching next block
          this.prefetchNextBlock();
        },
        error: (err) => {
          console.error('TTS error for block:', err);
          // Skip to next block, but under the consecutive-failure ceiling —
          // unless this is terminal (quota), which aborts the whole run.
          this.onBlockFailed(err);
        }
      });
  }

  private prefetchNextBlock(): void {
    const blocks = this._blocks();
    const nextIndex = this._currentBlockIndex() + 1;

    if (nextIndex >= blocks.length) return; // No more blocks to prefetch

    const nextBlock = blocks[nextIndex];
    const lang = this._detectedLanguage() || 'cs';
    const { voice, provider, voiceLangCode } = this.resolveVoiceAndProvider(lang);

    this.prefetchingBlockIndex = nextIndex;
    this.maybeTranslate(nextBlock.text, lang, voiceLangCode).pipe(
      switchMap(text => this.aiApiService.textToSpeech(text, voiceLangCode || lang, provider, voice)),
      take(1)
    ).subscribe({
        next: (audioContent) => {
          if (this.prefetchingBlockIndex === nextIndex) {
            this.prefetchedAudio = audioContent;
          }
        },
        error: (err) => {
          // A prefetch failure is normally harmless — the block is re-requested
          // when playback reaches it. Quota exhaustion is the exception: the
          // retry would fail identically, so abort now instead of letting the
          // current block finish into the same wall.
          this.prefetchedAudio = null;
          if (isQuotaExceeded(err)) {
            this.abortWithError('ai.quota-exceeded');
          }
        }
      });
  }

  private playAudioContent(audioContent: string): void {
    this.cleanupBlobUrl();
    this.isPlayingBlock = false;

    // audioContent is base64 encoded
    const binaryString = atob(audioContent);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);

    this.audio.src = url;
    this.isPlayingBlock = true;
    this.audio.play().then(() => {
      // Playback actually started: the block is being read, so reset the guard.
      this.audioUnlocked = true;
      this._playbackBlocked.set(false);
      this.consecutiveFailures = 0;
    }).catch(err => {
      if (!this.isPlayingBlock) return;
      this.isPlayingBlock = false;

      // A blocked autoplay is NOT a reason to skip the block: advancing here is
      // what made reading race through the whole document highlighting blocks and
      // turning pages while silent (issue #161). Hold position and let the user
      // resume with a tap, which counts as the gesture the browser is waiting for.
      if (this.isAutoplayBlocked(err)) {
        this._playbackBlocked.set(true);
        this._isPaused.set(true);
        return;
      }

      console.error('Failed to play TTS audio:', err);
      this.onBlockFailed();
    });
  }

  private cleanupBlobUrl(): void {
    if (this.audio.src && this.audio.src.startsWith('blob:')) {
      URL.revokeObjectURL(this.audio.src);
    }
  }

  /**
   * A rejected play() means "blocked", not "broken", when the browser refused the
   * gesture-less playback. Chrome/Safari report NotAllowedError for this.
   */
  private isAutoplayBlocked(err: unknown): boolean {
    return (err as { name?: string } | null)?.name === 'NotAllowedError';
  }

  /**
   * Stops reading and records why, for errors that will not recover on retry.
   * Quota exhaustion is the motivating case: every further block would spend
   * another failed call to reach the same answer, so abort the whole run at the
   * first one and tell the user instead of skipping blocks silently.
   */
  private abortWithError(messageKey: string): void {
    this.stop();
    this._error.set(messageKey);
    // Reading is driven from the viewer as often as from the AI panel, and the
    // transport controls vanish with `isReading`. A toast is the one surface the
    // user sees either way, so the run never just stops without explanation.
    this.toastService.show(messageKey);
  }

  /**
   * A block produced no audio. Skipping one bad block is fine, but a run of them
   * means something systemic is wrong, so stop instead of racing to the end.
   *
   * `err` is inspected for terminal conditions (quota) that must abort at once
   * rather than burn through the failure ceiling.
   */
  private onBlockFailed(err?: unknown): void {
    if (!this._isReading()) return;

    if (isQuotaExceeded(err)) {
      this.abortWithError('ai.quota-exceeded');
      return;
    }

    this.consecutiveFailures++;
    if (this.consecutiveFailures >= TtsService.MAX_CONSECUTIVE_FAILURES) {
      console.error(`TTS: stopping after ${this.consecutiveFailures} consecutive failures`);
      this.stop();
      return;
    }

    this.onBlockEnded();
  }

  private onBlockEnded(): void {
    if (!this._isReading()) return;

    const blocks = this._blocks();
    const nextIndex = this._currentBlockIndex() + 1;

    if (nextIndex < blocks.length) {
      // Move to next block on same page
      this._currentBlockIndex.set(nextIndex);
      this.readCurrentBlock();
    } else {
      // All blocks done, advance to next page
      this.advanceToNextPage();
    }
  }

  private advanceToNextPage(): void {
    if (!this._isReading()) return;

    const pages = this.detailViewService.pages;
    const currentPid = this._currentPagePid();
    const currentIndex = pages.findIndex(p => p.pid === currentPid);

    if (currentIndex >= 0 && currentIndex < pages.length - 1) {
      const nextPage = pages[currentIndex + 1];
      this._currentPagePid.set(nextPage.pid);
      this._currentBlockIndex.set(-1);
      this._blocks.set([]);
      this.prefetchedAudio = null;
      this.prefetchingBlockIndex = -1;

      // Navigate the viewer to the next page
      this.detailViewService.goToPage(currentIndex + 1);

      // Load ALTO for the next page and continue reading
      // Small delay to let the page navigation settle
      setTimeout(() => {
        this.loadPageAndRead(nextPage.pid);
      }, 500);
    } else {
      // No more pages, stop reading
      this.stop();
    }
  }

  /**
   * Resolves the voice + provider to use for TTS based on settings.
   * 1. If user set a voice via _voice signal, use that with current provider
   * 2. If settings have a voice for the detected language, use that entry's voice + provider
   * 3. If settings have a primary voice, use that entry's voice + provider
   * 4. Fall back to undefined (API default)
   *
   * Also returns voiceLangCode — the language the voice entry is configured for.
   * When voiceLangCode differs from the detected document language, the text
   * should be translated before TTS.
   */
  private resolveVoiceAndProvider(lang: string): { voice?: string; provider: TtsProvider; voiceLangCode?: string } {
    // Explicit override takes priority
    const override = this._voice();
    if (override) return { voice: override, provider: this._provider() };

    const settings = this.settingsService.settings;
    const voices = settings?.ttsVoices;
    if (!voices?.length) return { provider: this._provider() };

    // Look for exact language match
    const langEntry = voices.find(v => v.langCode === lang && v.voice);
    if (langEntry) return { voice: langEntry.voice, provider: langEntry.provider || this._provider(), voiceLangCode: langEntry.langCode };

    // Fall back to primary voice
    const primary = voices.find(v => v.isPrimary && v.voice);
    if (primary) return { voice: primary.voice, provider: primary.provider || this._provider(), voiceLangCode: primary.langCode };

    return { provider: this._provider() };
  }

  /**
   * Returns an Observable that translates text if the document language
   * differs from the voice entry language, or passes text through as-is.
   */
  private maybeTranslate(text: string, documentLang: string, voiceLangCode?: string): Observable<string> {
    if (!voiceLangCode || documentLang === voiceLangCode) {
      return of(text);
    }
    return this.aiApiService.translate(text, voiceLangCode);
  }
}
