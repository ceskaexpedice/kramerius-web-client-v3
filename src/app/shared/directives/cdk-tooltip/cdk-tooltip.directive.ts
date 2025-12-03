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
  private isTooltipVisible = signal(false);

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
    if (this.content) {
      this.elementRef.nativeElement.setAttribute('aria-label', this.content);
    }
  }

  ngOnDestroy(): void {
    this.clearTimeouts();
    this.destroyTooltip();
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
   * Show tooltip on focus
   */
  @HostListener('focus')
  onFocus(): void {
    this.show();
  }

  /**
   * Hide tooltip on blur
   */
  @HostListener('blur')
  onBlur(): void {
    this.hide();
  }

  /**
   * Handle touch events for mobile devices
   */
  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    if (!this.tooltipTouchGestures) {
      return;
    }

    // Prevent default to avoid triggering both touch and mouse events
    event.preventDefault();

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
    // Clear any pending hide timeout
    if (this.hideTimeoutId) {
      clearTimeout(this.hideTimeoutId);
      this.hideTimeoutId = undefined;
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
      setTimeout(() => {
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
