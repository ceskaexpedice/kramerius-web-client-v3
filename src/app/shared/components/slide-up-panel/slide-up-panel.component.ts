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

  /**
   * Drops the header row entirely - caption and close button both. For sheets
   * whose content already says what they are (a page or track grid needs no
   * "Strany" caption), where the row only costs phone height.
   *
   * The host is then responsible for its own dismiss control: the sidebars that
   * project into this sheet place an `app-sheet-close-button` on their leading
   * row, beside the search field (GitHub issue #177). Dragging the handle down,
   * tapping the backdrop and Escape all keep working regardless.
   */
  @Input() hideTitle = false;

  /** Initial height in vh when opened */
  @Input() initialHeight = 50;

  /** Minimum height in vh when dragging */
  @Input() minHeight = 30;

  /** Maximum height in vh when dragging */
  @Input() maxHeight = 90;

  /**
   * Optional snap heights (vh). When set, a released drag settles on the
   * nearest one instead of the default two stops (initialHeight / maxHeight).
   */
  @Input() snapPoints: number[] | null = null;

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

  private focusOrigin: HTMLElement | null = null;

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
        this.captureFocusOrigin();
        // Delay one frame so the panel renders off-screen first, then slides up
        requestAnimationFrame(() => {
          this.isRendered = true;
          this.cd.detectChanges();
          this.focusPanel();
        });
      } else if (this.peek) {
        // Peek mode: collapse back to the resting peek instead of dismissing.
        this.isRendered = true;
      } else if (!this.isClosing && this.isRendered) {
        // Closed from the outside rather than through close(): the host reset
        // the bound signal directly, which is how the sidebars' `manualToggle`
        // dismisses this sheet. Run the same slide-down close() would have run,
        // so both routes look identical - without this the panel vanished in a
        // single frame and left its backdrop mounted (GitHub issue #177).
        this.animateOut();
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
      this.restoreFocus();
      this.closed.emit();
      return;
    }
    this.animateOut();
  }

  /**
   * Plays the slide-down, then settles the closed state. Shared by close() and
   * by an external reset of the bound `isOpen`, so a sheet dismissed either way
   * animates the same. `isOpen.set(false)` is idempotent, which is what makes
   * it safe to run on the path where the signal is already false.
   */
  private animateOut(): void {
    this.isClosing = true;
    this.isRendered = false;
    // Wait for slide-down transition to finish
    setTimeout(() => {
      this.isClosing = false;
      this.isExpanded = false;
      this.isOpen.set(false);
      this.restoreFocus();
      this.closed.emit();
    }, 300);
  }

  /**
   * Remembers what had focus before the sheet opened so it can be restored on
   * close. Ignored when focus is already inside the sheet (re-open from peek).
   */
  private captureFocusOrigin(): void {
    const active = document.activeElement as HTMLElement | null;
    if (active && active !== document.body && !this.hostRef.nativeElement.contains(active)) {
      this.focusOrigin = active;
    }
  }

  /**
   * Moves focus onto the sheet container itself rather than its first tabbable
   * child. Auto-capturing the first tabbable (cdkTrapFocusAutoCapture) landed on
   * search inputs such as "Hľadať na stránkach", which pops the on-screen
   * keyboard over the sheet the moment it opens. The container is still inside
   * the focus trap, so screen readers and Tab start from the dialog.
   */
  private focusPanel(): void {
    const panel = this.hostRef.nativeElement.querySelector('.slide-up-panel') as HTMLElement | null;
    if (panel && !panel.contains(document.activeElement)) {
      panel.focus({ preventScroll: true });
    }
  }

  /** Returns focus to the opener, but only if the sheet still holds it. */
  private restoreFocus(): void {
    const origin = this.focusOrigin;
    this.focusOrigin = null;
    const active = document.activeElement;
    const focusLeftSheet = active && active !== document.body && !this.hostRef.nativeElement.contains(active);
    if (origin?.isConnected && !focusLeftSheet) {
      origin.focus({ preventScroll: true });
    }
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

    if (this.snapPoints?.length) {
      const target = this.snapPoints.reduce((best, p) =>
        Math.abs(p - this.currentHeight) < Math.abs(best - this.currentHeight) ? p : best, this.snapPoints[0]);
      this.currentHeight = target;
      this.isExpanded = target > 70;
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
