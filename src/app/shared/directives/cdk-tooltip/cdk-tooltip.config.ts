import { ConnectedPosition } from '@angular/cdk/overlay';

/**
 * Tooltip position options
 */
export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right' | 'auto';

/**
 * Configuration options for the tooltip
 */
export interface TooltipConfig {
  /**
   * The text content to display in the tooltip
   */
  content: string;

  /**
   * Preferred position of the tooltip relative to the trigger element
   * @default 'top'
   */
  position?: TooltipPosition;

  /**
   * Delay in milliseconds before showing the tooltip
   * @default 200
   */
  showDelay?: number;

  /**
   * Delay in milliseconds before hiding the tooltip
   * @default 0
   */
  hideDelay?: number;

  /**
   * Whether the tooltip should be disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Custom CSS class to apply to the tooltip
   */
  tooltipClass?: string;

  /**
   * Maximum width of the tooltip in pixels
   * @default 250
   */
  maxWidth?: number;

  /**
   * Whether to show the tooltip on touch devices
   * @default true
   */
  touchGestures?: boolean;
}

/**
 * Get CDK overlay positions for a given tooltip position
 */
export function getTooltipPositions(position: TooltipPosition): ConnectedPosition[] {
  const offset = 8;

  const positions: Record<Exclude<TooltipPosition, 'auto'>, ConnectedPosition[]> = {
    top: [
      {
        originX: 'center',
        originY: 'top',
        overlayX: 'center',
        overlayY: 'bottom',
        offsetY: -offset,
      },
    ],
    bottom: [
      {
        originX: 'center',
        originY: 'bottom',
        overlayX: 'center',
        overlayY: 'top',
        offsetY: offset,
      },
    ],
    left: [
      {
        originX: 'start',
        originY: 'center',
        overlayX: 'end',
        overlayY: 'center',
        offsetX: -offset,
      },
    ],
    right: [
      {
        originX: 'end',
        originY: 'center',
        overlayX: 'start',
        overlayY: 'center',
        offsetX: offset,
      },
    ],
  };

  // For 'auto', provide all positions in preferred order: top, bottom, left, right
  if (position === 'auto') {
    return [
      ...positions.top,
      ...positions.bottom,
      ...positions.left,
      ...positions.right,
    ];
  }

  return positions[position];
}

/**
 * Default tooltip configuration
 */
export const DEFAULT_TOOLTIP_CONFIG: Required<Omit<TooltipConfig, 'content' | 'tooltipClass'>> = {
  position: 'top',
  showDelay: 200,
  hideDelay: 0,
  disabled: false,
  maxWidth: 250,
  touchGestures: true,
};
