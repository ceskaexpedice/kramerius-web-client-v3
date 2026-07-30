import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
  AfterViewInit,
  Renderer2,
  ChangeDetectorRef,
  ElementRef,
  inject,
  effect,
  model
} from '@angular/core';
import { NgIf } from '@angular/common';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-slide-up-panel',
  imports: [NgIf, CdkTrapFocus, TranslatePipe],
  templateUrl: './slide-up-panel.component.html',
  styleUrl: './slide-up-panel.component.scss'
})
export class SlideUpPanelComponent implements AfterViewInit, OnDestroy {
  private renderer = inject(Renderer2);
  private cd = inject(ChangeDetectorRef);
  private hostRef = inject(ElementRef<HTMLElement>);

  /** Whether the panel is open */
  isOpen = model(false);

  /** Title displayed in the header */
  @Input() title = '';

  /** Initial height in vh when opened */
  @Input() initialHeight = 50;

  /** Minimum height in vh when dragging */
  @Input() minHeight = 30;

  /** Maximum height in vh when dragging */
  @Input() maxHeight = 90;

  /** Whether to show the backdrop overlay */
  @Input() showBackdrop = true;

  /** Whether to close when backdrop is clicked */
  @Input() closeOnBackdropClick = true;

  /** When true, the panel never fully dismisses: it rests as a peek (handle + header) and drags up to open. */
  @Input() peek = false;

  /** Distance in px from the viewport bottom for the peek resting state (e.g. above a fixed bar). */
  @Input() peekOffset = 0;

  /** Emitted when the sheet is closed */
  @Output() closed = new EventEmitter<void>();

  // State
  isDragging = false;
  isClosing = false;
  isRendered = false;
  currentHeight = 50;
  isExpanded = false;

  private startY = 0;
  private startHeight = 0;

  private unlistenMouseMove: (() => void) | null = null;
  private unlistenTouchMove: (() => void) | null = null;
  private unlistenMouseUp: (() => void) | null = null;
  private unlistenTouchEnd: (() => void) | null = null;

  constructor() {
    // React to isOpen changes — animate in/out
    effect(() => {
      const open = this.isOpen();
      if (open) {
        this.currentHeight = this.initialHeight;
        this.isExpanded = this.initialHeight > 70;
        // Delay one frame so the panel renders off-screen first, then slides up
        requestAnimationFrame(() => {
          this.isRendered = true;
          this.cd.detectChanges();
        });
      } else if (this.peek) {
        // Peek mode: collapse back to the resting peek instead of dismissing.
        this.isRendered = true;
      }
    });
  }

  ngAfterViewInit() {}

  /** True when resting in the collapsed peek band (not open, not being dragged). */
  get isCollapsedPeek(): boolean {
    return this.peek && !this.isOpen() && !this.isDragging;
  }

  open() {
    this.isOpen.set(true);
  }

  close() {
    if (this.isClosing) return;
    if (this.peek) {
      // Peek mode never fully dismisses — just return to the resting peek.
      this.isExpanded = false;
      this.isOpen.set(false);
      this.closed.emit();
      return;
    }
    this.isClosing = true;
    this.isRendered = false;
    // Wait for slide-down transition to finish
    setTimeout(() => {
      this.isClosing = false;
      this.isOpen.set(false);
      this.closed.emit();
    }, 300);
  }

  onBackdropClick() {
    if (this.closeOnBackdropClick) {
      this.close();
    }
  }

  // Drag handlers
  onDragStart(event: MouseEvent | TouchEvent) {
    // When starting from the collapsed peek, seed currentHeight from the actual
    // visible peek band (in vh) so the sheet tracks the finger from where it sits
    // instead of jumping to the stale height value.
    if (this.peek && !this.isOpen()) {
      this.currentHeight = this.getPeekHeightVh();
    }
    this.isDragging = true;
    this.startY = this.getClientY(event);
    this.startHeight = this.currentHeight;
    event.preventDefault();
    this.addDragListeners();
  }

  /** Collapsed peek band height converted from px (CSS custom property) to vh. */
  private getPeekHeightVh(): number {
    const raw = getComputedStyle(this.hostRef.nativeElement)
      .getPropertyValue('--slide-up-peek-height').trim();
    const px = parseFloat(raw) || 60;
    return (px / window.innerHeight) * 100;
  }

  private addDragListeners() {
    this.unlistenMouseMove = this.renderer.listen('window', 'mousemove', (e: MouseEvent) => this.onDragMove(e));
    this.unlistenTouchMove = this.renderer.listen('window', 'touchmove', (e: TouchEvent) => this.onDragMove(e));
    this.unlistenMouseUp = this.renderer.listen('window', 'mouseup', () => this.onDragEnd());
    this.unlistenTouchEnd = this.renderer.listen('window', 'touchend', () => this.onDragEnd());
  }

  private removeDragListeners() {
    this.unlistenMouseMove?.();
    this.unlistenTouchMove?.();
    this.unlistenMouseUp?.();
    this.unlistenTouchEnd?.();
    this.unlistenMouseMove = null;
    this.unlistenTouchMove = null;
    this.unlistenMouseUp = null;
    this.unlistenTouchEnd = null;
  }

  onDragMove(event: MouseEvent | TouchEvent) {
    if (!this.isDragging) return;

    const currentY = this.getClientY(event);
    const deltaY = this.startY - currentY;
    const deltaVh = (deltaY / window.innerHeight) * 100;

    // In peek mode the sheet can shrink all the way down to the collapsed band,
    // so the lower bound is the peek height rather than minHeight.
    const lower = this.peek ? this.getPeekHeightVh() : this.minHeight;
    this.currentHeight = Math.max(lower, Math.min(this.maxHeight, this.startHeight + deltaVh));
    this.isExpanded = this.currentHeight > 70;

    if (event.cancelable) {
      event.preventDefault();
    }

    this.cd.detectChanges();
  }

  onDragEnd() {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.removeDragListeners();

    const mid = (this.minHeight + this.maxHeight) / 2;

    if (this.peek) {
      // In peek mode: snap open once dragged a modest amount above the peek band,
      // else collapse back. `isOpen` drives the class that removes the collapse
      // transform, and currentHeight is set to the open target.
      const openThreshold = this.getPeekHeightVh() + 15;
      if (this.currentHeight >= openThreshold) {
        this.currentHeight = this.initialHeight;
        this.isExpanded = this.initialHeight > 70;
        this.isOpen.set(true);
      } else {
        this.isExpanded = false;
        this.isOpen.set(false);
      }
      return;
    }

    // Dismiss if dragged below minimum threshold
    if (this.currentHeight <= this.minHeight) {
      this.close();
      return;
    }

    // Snap to nearest breakpoint
    if (this.currentHeight < mid) {
      this.currentHeight = this.initialHeight;
      this.isExpanded = false;
    } else {
      this.currentHeight = this.maxHeight;
      this.isExpanded = true;
    }
  }

  ngOnDestroy() {
    this.removeDragListeners();
  }

  private getClientY(event: MouseEvent | TouchEvent): number {
    return event instanceof MouseEvent
      ? event.clientY
      : event.touches[0]?.clientY || 0;
  }
}
