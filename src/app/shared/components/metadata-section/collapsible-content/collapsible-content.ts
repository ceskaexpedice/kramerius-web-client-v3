import { Component, ElementRef, Input, ViewChild, AfterViewInit, OnChanges, OnDestroy, SimpleChanges, ChangeDetectorRef, NgZone } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-collapsible-content',
  imports: [TranslatePipe],
  templateUrl: './collapsible-content.html',
  styleUrl: './collapsible-content.scss'
})
export class CollapsibleContent implements AfterViewInit, OnChanges, OnDestroy {

  @Input() collapsible: boolean = false;
  @Input() maxLines: number = 3;
  /** Pass any value that changes when content changes (e.g. uuid, items.length) to re-evaluate overflow */
  @Input() contentKey: any;
  /** Translation keys of the toggle (default "more" / "less"). */
  @Input() moreLabel = 'more';
  @Input() lessLabel = 'less';

  @ViewChild('contentRef') contentRef!: ElementRef<HTMLDivElement>;

  isCollapsed: boolean = true;
  isOverflowing: boolean = false;

  private resizeObserver: ResizeObserver | null = null;
  private lastWidth = -1;

  constructor(private cdr: ChangeDetectorRef, private zone: NgZone) {}

  ngAfterViewInit(): void {
    if (this.collapsible) {
      this.checkOverflow();
      // Re-measure when the width changes: content measured while its panel was
      // hidden (0px wide) or before a resize would otherwise show a "more"
      // toggle under a value that fits on one line (or hide a needed one).
      if (typeof ResizeObserver !== 'undefined' && this.contentRef?.nativeElement) {
        this.zone.runOutsideAngular(() => {
          this.resizeObserver = new ResizeObserver(entries => {
            const width = Math.round(entries[0]?.contentRect.width ?? 0);
            if (width === this.lastWidth || width === 0) return;
            this.lastWidth = width;
            if (this.isCollapsed) {
              this.zone.run(() => this.checkOverflow());
            }
          });
          this.resizeObserver.observe(this.contentRef.nativeElement);
        });
      }
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.collapsible && (changes['contentKey'] || changes['maxLines'])) {
      this.isCollapsed = true;
      this.isOverflowing = false;
      // Defer to next tick so projected content has re-rendered
      setTimeout(() => this.checkOverflow());
    }
  }

  private checkOverflow(): void {
    const el = this.contentRef?.nativeElement;
    if (!el) return;
    // Hidden (e.g. collapsed side panel): nothing meaningful to measure yet.
    if (el.clientWidth === 0) return;

    // Measure full height without clamp, then compare against clamped clientHeight
    el.classList.remove('collapsed');
    const fullHeight = el.scrollHeight;
    el.classList.add('collapsed');
    // clientHeight now reflects the clamped box height
    const clampedHeight = el.clientHeight;

    // +1 tolerates sub-pixel rounding that made single-line values "overflow".
    this.isOverflowing = fullHeight > clampedHeight + 1;
    this.cdr.detectChanges();
  }

  toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
  }

}
