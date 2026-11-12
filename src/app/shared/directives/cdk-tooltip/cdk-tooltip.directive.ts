import {
  Directive,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  inject,
  HostListener,
  signal,
  effect,
  TemplateRef,
} from '@angular/core';
import {
  Overlay,
  OverlayRef,
  OverlayPositionBuilder,
  FlexibleConnectedPositionStrategy,
} from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { FocusMonitor } from '@angular/cdk/a11y';
import { CdkTooltipComponent } from './cdk-tooltip.component';
import {
  TooltipPosition,
  getTooltipPositions,
  DEFAULT_TOOLTIP_CONFIG,
} from './cdk-tooltip.config';

/**
 * Directive that attaches a CDK-based tooltip to an element.
 * Supports both plain text and HTML template content.
 *
 * @example Plain text
 * <button appCdkTooltip="Save your changes">Save</button>
 *
 * @example With options
 * <button
 *   appCdkTooltip="Delete this item"
 *   [tooltipPosition]="'bottom'"
 *   [tooltipShowDelay]="500"
 *   [tooltipClass]="'tooltip-error'">
 *   Delete
 * </button>
 *
 * @example HTML template content
 * <button [appCdkTooltipTemplate]="tooltipContent">
 *   Hover me
 * </button>
 * <ng-template #tooltipContent>
 *   <strong>Bold text</strong> and <em>italic text</em>
 * </ng-template>
 */
@Directive({
  selector: '[appCdkTooltip]',
  standalone: true,
  exportAs: 'cdkTooltip',
})
export class CdkTooltipDirective implements OnInit, OnDestroy {
  private overlay = inject(Overlay);
  private overlayPositionBuilder = inject(OverlayPositionBuilder);
  private elementRef = inject(ElementRef);
  private focusMonitor = inject(FocusMonitor);

  /**
   * The tooltip content text (plain text)
   */
  @Input('appCdkTooltip') content = '';

  /**
   * The tooltip content as a TemplateRef (for HTML content)
   * If provided, this takes precedence over plain text content
   */
  @Input() appCdkTooltipTemplate?: TemplateRef<any>;

  /**
   * Tooltip position relative to the element
   */
  @Input() tooltipPosition: TooltipPosition = DEFAULT_TOOLTIP_CONFIG.position;

  /**
   * Delay in milliseconds before showing the tooltip
   */
  @Input() tooltipShowDelay: number = DEFAULT_TOOLTIP_CONFIG.showDelay;

  /**
   * Delay in milliseconds before hiding the tooltip
   */
  @Input() tooltipHideDelay: number = DEFAULT_TOOLTIP_CONFIG.hideDelay;

  /**
   * Whether the tooltip is disabled
   */
  @Input() tooltipDisabled: boolean = DEFAULT_TOOLTIP_CONFIG.disabled;

  /**
   * Custom CSS class to apply to the tooltip
   */
  @Input() tooltipClass?: string;

  /**
   * Maximum width of the tooltip in pixels
   */
  @Input() tooltipMaxWidth: number = DEFAULT_TOOLTIP_CONFIG.maxWidth;

  /**
   * Whether to show tooltip on touch devices
   */
  @Input() tooltipTouchGestures: boolean = DEFAULT_TOOLTIP_CONFIG.touchGestures;

  private overlayRef?: OverlayRef;
  private tooltipInstance?: CdkTooltipComponent;
  private showTimeoutId?: ReturnType<typeof setTimeout>;
  private hideTimeoutId?: ReturnType<typeof setTimeout>;
  // Timer that disposes the overlay after the hide animation. Tracked so it can
  // be cancelled; an untracked timer was firing against a recreated overlay.
  private destroyTimeoutId?: ReturnType<typeof setTimeout>;
  private isTooltipVisible = signal(false);
  /**
   * The host's native `title`, parked while the custom tooltip is active.
   * Keeping `title` in the markup is fine for a11y/fallback, but the browser
   * would render its own tooltip on top of ours — so it is removed for the
   * duration of a hover/focus and put back afterwards.
   */
  private suppressedTitle: string | null = null;

  /**
   * Unique ID for accessibility
   */
  private tooltipId = `cdk-tooltip-${Math.random().toString(36).substring(2, 9)}`;

  constructor() {
    // Update ARIA attributes when tooltip visibility changes
    effect(() => {
      if (this.isTooltipVisible()) {
        this.elementRef.nativeElement.setAttribute('aria-describedby', this.tooltipId);
      } else {
        this.elementRef.nativeElement.removeAttribute('aria-describedby');
      }
    });
  }

  ngOnInit(): void {
    // Set initial ARIA label if content is available
    // …but never overwrite an explicit, more specific aria-label on the host
    // (e.g. "Kopírovat ISBN" vs. the generic tooltip "Kopírovat").
    if (this.content && !this.elementRef.nativeElement.hasAttribute('aria-label')) {
      this.elementRef.nativeElement.setAttribute('aria-label', this.content);
    }

    // Drive focus show/hide through FocusMonitor so we know the focus ORIGIN.
    // Only keyboard focus should reveal the tooltip; mouse focus is already
    // covered by mouseenter, and 'program' focus (e.g. a closing dialog/popup
    // restoring focus to this trigger) must NOT reopen the tooltip while the
    // pointer is elsewhere — that was the stuck-tooltip-after-closing-popup bug.
    this.focusMonitor.monitor(this.elementRef).subscribe(origin => {
      if (origin === 'keyboard') {
        this.show();
      } else if (origin === null) {
        // Element lost focus.
        this.hide();
      }
    });
  }

  ngOnDestroy(): void {
    this.restoreNativeTitle();
    this.clearTimeouts();
    this.destroyTooltip();
    this.focusMonitor.stopMonitoring(this.elementRef);
  }

  /**
   * Show tooltip on mouse enter
   */
  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.show();
  }

  /**
   * Hide tooltip on mouse leave
   */
  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.hide();
  }

  /**
   * Hide immediately when the host is clicked.
   *
   * A click commonly opens a dialog/overlay, navigates away, or toggles the
   * host out of the DOM (@if/*ngIf). In those cases neither mouseleave nor blur
   * fires reliably, leaving the tooltip stranded on screen. Killing it on click
   * makes that correct everywhere, without each call site having to opt in.
   * Also on pointerdown, so a tooltip doesn't hang in place while the host is
   * being dragged (e.g. the selection toolbar's drag handle).
   */
  @HostListener('click')
  @HostListener('pointerdown')
  onClick(): void {
    this.hideImmediately();
  }

  /**
   * Hide immediately when the window loses focus (e.g. an alert, tab switch, or
   * native dialog), which can leave the host without emitting mouseleave/blur.
   */
  @HostListener('window:blur')
  onWindowBlur(): void {
    if (this.isTooltipVisible() || this.showTimeoutId) {
      this.hideImmediately();
    }
  }

  /**
   * Handle touch events for mobile devices
   */
  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    if (!this.tooltipTouchGestures || (!this.content && !this.appCdkTooltipTemplate)) {
      return;
    }

    // Toggle tooltip on touch
    if (this.isTooltipVisible()) {
      this.hide();
    } else {
      this.show();

      // Auto-hide after 2 seconds on touch devices
      setTimeout(() => {
        if (this.isTooltipVisible()) {
          this.hide();
        }
      }, 2000);
    }
  }

  /**
   * Show the tooltip
   */
  show(): void {
    if (!this.tooltipDisabled && (this.content || this.appCdkTooltipTemplate)) {
      this.suppressNativeTitle();
    }

    // Clear any pending hide timeout
    if (this.hideTimeoutId) {
      clearTimeout(this.hideTimeoutId);
      this.hideTimeoutId = undefined;
    }

    // Cancel a pending post-animation destroy so re-entering during the hide
    // animation keeps (and re-shows) the existing tooltip instead of disposing it.
    if (this.destroyTimeoutId) {
      clearTimeout(this.destroyTimeoutId);
      this.destroyTimeoutId = undefined;
      if (this.tooltipInstance) {
        this.tooltipInstance.show();
      }
    }

    // Don't show if disabled or no content/template
    if (this.tooltipDisabled || (!this.content && !this.appCdkTooltipTemplate) || this.isTooltipVisible()) {
      return;
    }

    // Clear any existing show timeout
    if (this.showTimeoutId) {
      clearTimeout(this.showTimeoutId);
    }

    // Show after delay
    this.showTimeoutId = setTimeout(() => {
      this.createTooltip();
      this.isTooltipVisible.set(true);

      // Trigger show animation
      if (this.tooltipInstance) {
        this.tooltipInstance.show();
      }
    }, this.tooltipShowDelay);
  }

  /**
   * Hide the tooltip
   */
  hide(): void {
    this.restoreNativeTitle();

    // Clear any pending show timeout
    if (this.showTimeoutId) {
      clearTimeout(this.showTimeoutId);
      this.showTimeoutId = undefined;
    }

    if (!this.isTooltipVisible()) {
      return;
    }

    // Clear any existing hide timeout
    if (this.hideTimeoutId) {
      clearTimeout(this.hideTimeoutId);
    }

    // Hide after delay
    this.hideTimeoutId = setTimeout(() => {
      // Trigger hide animation
      if (this.tooltipInstance) {
        this.tooltipInstance.hide();
      }

      // Wait for animation to complete before destroying
      this.destroyTimeoutId = setTimeout(() => {
        this.destroyTimeoutId = undefined;
        this.destroyTooltip();
        this.isTooltipVisible.set(false);
      }, 150); // Match animation duration
    }, this.tooltipHideDelay);
  }

  /**
   * Create the tooltip overlay
   */
  private createTooltip(): void {
    if (this.overlayRef) {
      return;
    }

    // Create position strategy
    const positionStrategy = this.getPositionStrategy();

    // Create overlay
    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      panelClass: 'cdk-tooltip-panel',
    });

    // Create and attach tooltip component
    const tooltipPortal = new ComponentPortal(CdkTooltipComponent);
    const tooltipRef = this.overlayRef.attach(tooltipPortal);
    this.tooltipInstance = tooltipRef.instance;

    // Set tooltip properties
    if (this.appCdkTooltipTemplate) {
      // Use template if provided
      this.tooltipInstance.contentTemplate.set(this.appCdkTooltipTemplate);
    } else {
      // Otherwise use plain text
      this.tooltipInstance.content.set(this.content);
    }

    this.tooltipInstance.maxWidth.set(this.tooltipMaxWidth);

    if (this.tooltipClass) {
      this.tooltipInstance.tooltipClass.set(this.tooltipClass);
    }

    // Set tooltip ID for accessibility
    const tooltipElement = this.overlayRef.overlayElement;
    tooltipElement.setAttribute('id', this.tooltipId);
    tooltipElement.setAttribute('role', 'tooltip');
  }

  /**
   * Destroy the tooltip overlay
   */
  private destroyTooltip(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = undefined;
      this.tooltipInstance = undefined;
    }
  }

  /**
   * Get the position strategy for the overlay
   */
  private getPositionStrategy(): FlexibleConnectedPositionStrategy {
    const positions = getTooltipPositions(this.tooltipPosition);

    return this.overlayPositionBuilder
      .flexibleConnectedTo(this.elementRef)
      .withPositions(positions)
      .withFlexibleDimensions(false)
      .withPush(true)
      .withViewportMargin(8);
  }

  /** Park the host's `title` so the browser doesn't show a second, native tooltip. */
  private suppressNativeTitle(): void {
    const host = this.elementRef.nativeElement as HTMLElement;
    const title = host.getAttribute('title');
    if (title === null) {
      return;
    }
    this.suppressedTitle = title;
    host.removeAttribute('title');
  }

  /**
   * Put the parked `title` back. If something (e.g. an Angular `[title]`
   * binding) re-set it in the meantime, that newer value wins.
   */
  private restoreNativeTitle(): void {
    if (this.suppressedTitle === null) {
      return;
    }
    const host = this.elementRef.nativeElement as HTMLElement;
    if (!host.hasAttribute('title')) {
      host.setAttribute('title', this.suppressedTitle);
    }
    this.suppressedTitle = null;
  }

  /**
   * Clear all pending timeouts
   */
  private clearTimeouts(): void {
    if (this.showTimeoutId) {
      clearTimeout(this.showTimeoutId);
      this.showTimeoutId = undefined;
    }
    if (this.hideTimeoutId) {
      clearTimeout(this.hideTimeoutId);
      this.hideTimeoutId = undefined;
    }
    if (this.destroyTimeoutId) {
      clearTimeout(this.destroyTimeoutId);
      this.destroyTimeoutId = undefined;
    }
  }

  /**
   * Programmatically show the tooltip (can be called from template using #tooltip)
   */
  showTooltip(): void {
    this.show();
  }

  /**
   * Programmatically hide the tooltip (can be called from template using #tooltip)
   */
  hideTooltip(): void {
    this.hide();
  }

  /**
   * Immediately hide and destroy the tooltip, bypassing the hide delay and
   * animation. Useful when the host element triggers an action (e.g. opening a
   * dialog) that steals focus, so neither mouseleave nor blur fires reliably.
   */
  hideImmediately(): void {
    // The native title stays parked until the pointer/focus actually leaves
    // (hide() / destroy), so it doesn't pop up while the pointer still rests
    // on the button right after a click or during a drag.
    this.clearTimeouts();
    this.destroyTooltip();
    this.isTooltipVisible.set(false);
  }

  /**
   * Programmatically toggle the tooltip (can be called from template using #tooltip)
   */
  toggleTooltip(): void {
    if (this.isTooltipVisible()) {
      this.hide();
    } else {
      this.show();
    }
  }
}
