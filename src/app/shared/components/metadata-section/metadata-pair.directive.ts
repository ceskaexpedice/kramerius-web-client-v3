import { Directive, ElementRef, NgZone, OnDestroy, OnInit, inject } from '@angular/core';

/** Added to the host while its fields don't each fit a half: one column instead. */
export const METADATA_PAIR_STACKED = 'metadata-pair--stacked';

/**
 * Two related fields (volume + issue, accessibility + licence) sit in two equal
 * columns only when each one fits its half at its natural width - no wrapped
 * label or value. Otherwise they stack. CSS alone can't tell whether content
 * would wrap, so this measures each field's max-content width against the half
 * whenever the host resizes or its content changes.
 */
@Directive({
  selector: '[appMetadataPair]',
  standalone: true
})
export class MetadataPairDirective implements OnInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly zone = inject(NgZone);
  private resizeObserver: ResizeObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  private frame = 0;

  ngOnInit(): void {
    this.zone.runOutsideAngular(() => {
      this.resizeObserver = new ResizeObserver(() => this.schedule());
      this.resizeObserver.observe(this.host);
      // Labels and values can arrive later (translations, async data).
      this.mutationObserver = new MutationObserver(() => this.schedule());
      this.mutationObserver.observe(this.host, { childList: true, subtree: true, characterData: true });
      this.update();
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.mutationObserver?.disconnect();
    cancelAnimationFrame(this.frame);
  }

  private schedule(): void {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.update());
  }

  /** Measures synchronously (no paint in between), so the toggle never flickers. */
  update(): void {
    const fields = Array.from(this.host.children) as HTMLElement[];
    const gap = parseFloat(getComputedStyle(this.host).columnGap) || 0;
    const half = (this.host.clientWidth - gap) / 2;
    const fits = fields.length === 2 && fields.every(field => this.maxContentWidth(field) <= half + 0.5);
    this.host.classList.toggle(METADATA_PAIR_STACKED, !fits);
  }

  private maxContentWidth(field: HTMLElement): number {
    const previous = field.style.width;
    field.style.width = 'max-content';
    const width = field.getBoundingClientRect().width;
    field.style.width = previous;
    return width;
  }
}
