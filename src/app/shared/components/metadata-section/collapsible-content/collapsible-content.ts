import { Component, ElementRef, Input, ViewChild, AfterViewInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-collapsible-content',
  imports: [TranslatePipe],
  templateUrl: './collapsible-content.html',
  styleUrl: './collapsible-content.scss'
})
export class CollapsibleContent implements AfterViewInit, OnChanges {

  @Input() collapsible: boolean = false;
  @Input() maxLines: number = 3;
  /** Pass any value that changes when content changes (e.g. uuid, items.length) to re-evaluate overflow */
  @Input() contentKey: any;

  @ViewChild('contentRef') contentRef!: ElementRef<HTMLDivElement>;

  isCollapsed: boolean = true;
  isOverflowing: boolean = false;

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    if (this.collapsible) {
      this.checkOverflow();
    }
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

    // Measure full height without clamp, then compare against clamped clientHeight
    el.classList.remove('collapsed');
    const fullHeight = el.scrollHeight;
    el.classList.add('collapsed');
    // clientHeight now reflects the clamped box height
    const clampedHeight = el.clientHeight;

    this.isOverflowing = fullHeight > clampedHeight;
    this.cdr.detectChanges();
  }

  toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
  }

}
