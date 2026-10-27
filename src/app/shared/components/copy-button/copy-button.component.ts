import { Component, Input, OnDestroy, inject, signal } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CdkTooltipDirective } from '../../directives';

/**
 * Small icon button that copies a value (identifier, URN:NBN, ISBN…) to the
 * clipboard. Confirms visually (tick icon) and to screen readers (polite
 * live announcement), so the result never depends on sight alone.
 */
@Component({
  selector: 'app-copy-button',
  imports: [TranslatePipe, CdkTooltipDirective],
  template: `
    <button type="button" class="copy-button"
            [class.copy-button--done]="copied()"
            [attr.aria-label]="'copy-value--arialabel' | translate:{ label: label || value }"
            [appCdkTooltip]="(copied() ? 'copied' : 'copy') | translate"
            (click)="copy($event)">
      <i [class]="copied() ? 'icon-copy-success' : 'icon-copy'" aria-hidden="true"></i>
    </button>
  `,
  styles: `
    :host { display: inline-flex; vertical-align: middle; }
    .copy-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      padding: 0;
      border: none;
      border-radius: var(--spacing-x1);
      background: transparent;
      color: var(--color-text-tertiary);
      cursor: pointer;
      flex-shrink: 0;

      i { font-size: var(--font-size-base); line-height: 1; }

      &:hover { color: var(--color-primary); background: var(--color-bg-light); }
      &:focus-visible { outline: 2px solid var(--color-border-primary-default); outline-offset: 1px; }
      &.copy-button--done { color: var(--color-text-success, var(--color-primary)); }

      // 40px hit area on touch screens without growing the inline glyph.
      @media (pointer: coarse) {
        position: relative;
        &::after { content: ''; position: absolute; inset: -8px; }
      }
    }
  `,
})
export class CopyButtonComponent implements OnDestroy {
  /** The text that ends up in the clipboard. */
  @Input({ required: true }) value = '';
  /** Human name of the value for the accessible name, e.g. "URN:NBN". */
  @Input() label = '';

  private clipboard = inject(Clipboard);
  private announcer = inject(LiveAnnouncer);
  private translate = inject(TranslateService);
  copied = signal(false);
  private resetTimer: ReturnType<typeof setTimeout> | null = null;

  copy(event: Event): void {
    event.stopPropagation();
    if (!this.value) return;
    if (this.clipboard.copy(this.value)) {
      this.copied.set(true);
      this.announcer.announce(this.translate.instant('copied'), 'polite');
      if (this.resetTimer) clearTimeout(this.resetTimer);
      this.resetTimer = setTimeout(() => this.copied.set(false), 2000);
    }
  }

  ngOnDestroy(): void {
    if (this.resetTimer) clearTimeout(this.resetTimer);
  }
}
